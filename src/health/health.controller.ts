import { Controller, Get } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';

export interface HealthResponse {
  status: 'ok';
  service: string;
  env: string;
}

/** Thin endpoint: proves the service is up and which env it booted in. */
@Controller('health')
export class HealthController {
  constructor(private readonly config: AppConfigService) {}

  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      service: this.config.serviceName,
      env: this.config.env,
    };
  }
}
