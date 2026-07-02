import { AppConfigService } from '../config/app-config.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports ok with the service name and env', () => {
    const config = {
      serviceName: 'fed-tht-label-check',
      env: 'test',
    } as AppConfigService;

    const controller = new HealthController(config);

    expect(controller.check()).toEqual({
      status: 'ok',
      service: 'fed-tht-label-check',
      env: 'test',
    });
  });
});
