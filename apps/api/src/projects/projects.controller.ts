import { Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ensureManagerOrAbove } from '../auth/roles';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, CreateTaskDto, UpdateProjectDto, UpdateTaskDto } from './projects.dto';

function serializeProject(project: any) {
  return {
    ...project,
    budget: project.budget == null ? null : Number(project.budget),
  };
}

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const projects = await this.prisma.project.findMany({
      where: { companyId: user.companyId },
      include: { customer: true, tasks: { orderBy: [{ status: 'asc' }, { priority: 'desc' }, { dueDate: 'asc' }] } },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { updatedAt: 'desc' }],
    });
    return projects.map(serializeProject);
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateProjectDto) {
    ensureManagerOrAbove(user, 'create projects');
    if (input.customerId) {
      const customer = await this.prisma.customer.findFirst({ where: { id: input.customerId, companyId: user.companyId } });
      if (!customer) throw new NotFoundException('Customer not found');
    }

    const project = await this.prisma.project.create({
      data: {
        name: input.name,
        customerId: input.customerId || undefined,
        companyId: user.companyId,
        status: input.status,
        budget: input.budget,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        description: input.description,
      },
      include: { customer: true, tasks: true },
    });
    return serializeProject(project);
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() input: UpdateProjectDto) {
    ensureManagerOrAbove(user, 'update projects');
    await this.ensureProject(user.companyId, id);
    const project = await this.prisma.project.update({
      where: { id },
      data: {
        ...input,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      },
      include: { customer: true, tasks: true },
    });
    return serializeProject(project);
  }

  @Post(':id/tasks')
  async createTask(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() input: CreateTaskDto) {
    ensureManagerOrAbove(user, 'create tasks');
    await this.ensureProject(user.companyId, id);
    return this.prisma.task.create({
      data: {
        title: input.title,
        projectId: id,
        companyId: user.companyId,
        status: input.status,
        priority: input.priority,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        assignee: input.assignee,
        description: input.description,
      },
    });
  }

  @Patch('tasks/:taskId')
  async updateTask(@CurrentUser() user: AuthenticatedUser, @Param('taskId') taskId: string, @Body() input: UpdateTaskDto) {
    const existing = await this.prisma.task.findFirst({ where: { id: taskId, companyId: user.companyId } });
    if (!existing) throw new NotFoundException('Task not found');
    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...input,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      },
    });
  }

  private async ensureProject(companyId: string, id: string) {
    const project = await this.prisma.project.findFirst({ where: { id, companyId } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
}
