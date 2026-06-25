# API Spec — Alpha 0.1

## Auth
- POST /auth/register
- POST /auth/login
- POST /auth/logout
- POST /auth/forgot-password
- GET /auth/me

## Company
- POST /companies
- GET /companies/current
- PATCH /companies/current

## Employees
- GET /employees
- POST /employees
- GET /employees/:id
- PATCH /employees/:id
- DELETE /employees/:id

## Dashboard
- GET /dashboard/summary

## Asher AI
- POST /ai/ask
