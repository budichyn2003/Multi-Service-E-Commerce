import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  ready(): { status: string; checks: Record<string, string> } {
    // Redis/dependency checks arrive with Phase 3.
    return { status: 'ready', checks: {} };
  }
}
