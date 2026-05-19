import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  check(): { status: string; service: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'api-server',
      timestamp: new Date().toISOString()
    };
  }
}

