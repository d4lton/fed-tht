import {Body, Controller, Get, Param, Patch, Post, Put} from "@nestjs/common";
import {ApplicationsService} from "./applications.service";
import {ApplicationSummary, ApplicationView} from "./application-view";
import {CreateApplicationDto, UpdateDetailsDto, UpdateImagesDto} from "./application.dto";

/**
 * The application record's web surface. Thin — the orchestration (including
 * running the check as part of every save) lives in the service.
 */
@Controller("applications")
export class ApplicationsController {

  constructor(private readonly applications: ApplicationsService) {}

  /** Create an application and run its check as part of saving. */
  @Post()
  create(@Body() dto: CreateApplicationDto): Promise<ApplicationView> {
    return this.applications.create(dto);
  }

  /** List applications with the fields worth showing at a glance and a status. */
  @Get()
  list(): Promise<ApplicationSummary[]> {
    return this.applications.list();
  }

  /** Everything on file for one application: its fields, images, and result. */
  @Get(":id")
  get(@Param("id") id: string): Promise<ApplicationView> {
    return this.applications.get(id);
  }

  /** Change an application's details and re-run the check. */
  @Patch(":id")
  updateDetails(@Param("id") id: string, @Body() dto: UpdateDetailsDto): Promise<ApplicationView> {
    return this.applications.updateDetails(id, dto);
  }

  /** Attach or replace an application's images and re-run the check. */
  @Put(":id/images")
  updateImages(@Param("id") id: string, @Body() dto: UpdateImagesDto): Promise<ApplicationView> {
    return this.applications.updateImages(id, dto);
  }

}
