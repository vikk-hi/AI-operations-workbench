import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { DashboardRange, TasksDashboardResponse } from '@shared/api.interface';
import { WorkbenchService } from './workbench.service';

@Controller('api/workbench')
export class WorkbenchController {
  constructor(private readonly service: WorkbenchService) {}

  @Get('core')
  getCore(@Query('range') requested?: string) {
    const range: DashboardRange = ['day', '7d', 'mtd', 'ytd'].includes(requested ?? '') ? requested as DashboardRange : 'day';
    return this.service.getCore(range);
  }

  @Get('tasks') getTasks(@Req() req: Request) {
    const context = req.userContext;
    const viewer: TasksDashboardResponse['viewer'] = context?.userId
      ? {
        id: context.userId,
        name: context.userName || '当前用户',
        role: context.roles?.includes('admin') ? 'developer' : 'member',
      }
      : null;
    return this.service.getTasks(viewer, Boolean(context?.appId));
  }
  @Get('overview') getOverview() { return this.service.getOverview(); }
  @Get('sources') getSources() { return this.service.getSources(); }
  @Get('categories') getCategories() { return this.service.getCategories(); }
  @Get('products') getProducts() { return this.service.getProducts(); }
  @Get('targets') getTargets() { return this.service.getTargets(); }
  @Get('timeline') getTimeline() { return this.service.getTimeline(); }
}
