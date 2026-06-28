import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  status() {
    return { status: 'ok', service: 'real-business-suite-api', timestamp: new Date().toISOString() };
  }
}
