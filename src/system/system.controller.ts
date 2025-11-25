import { Controller, Get, HttpStatus } from '@nestjs/common';
import { SystemService } from './system.service';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('System')
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('health')
  @ApiResponse({ status: HttpStatus.OK, description: 'System health status' })
  async getHealth() {
    const health = await this.systemService.getSystemHealth();
    return health;
  }
}
