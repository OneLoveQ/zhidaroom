import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/auth/auth-request.js';
import { AdminService } from './admin.service.js';

interface UpdateUserStatusBody {
  status: 'active' | 'disabled';
}

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  listUsers(@Req() request: AuthenticatedRequest) {
    this.adminService.assertAdmin(request.auth);
    return this.adminService.listUsers();
  }

  @Patch('users/:userId/status')
  updateUserStatus(
    @Req() request: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() body: UpdateUserStatusBody
  ) {
    return this.adminService.updateUserStatus(request.auth, userId, body.status);
  }

  @Get('workspaces')
  listWorkspaces(@Req() request: AuthenticatedRequest) {
    this.adminService.assertAdmin(request.auth);
    return this.adminService.listWorkspaces();
  }

  @Get('classes')
  listClasses(@Req() request: AuthenticatedRequest) {
    this.adminService.assertAdmin(request.auth);
    return this.adminService.listClasses();
  }

  @Get('classes/:classId/students')
  listStudents(@Req() request: AuthenticatedRequest, @Param('classId') classId: string) {
    this.adminService.assertAdmin(request.auth);
    return this.adminService.listStudents(classId);
  }

  @Get('questions')
  listQuestions(@Req() request: AuthenticatedRequest) {
    this.adminService.assertAdmin(request.auth);
    return this.adminService.listQuestions();
  }

  @Get('sessions')
  listSessions(@Req() request: AuthenticatedRequest) {
    this.adminService.assertAdmin(request.auth);
    return this.adminService.listSessions();
  }
}
