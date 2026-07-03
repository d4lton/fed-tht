import {Module} from "@nestjs/common";
import {ChecksModule} from "../checks/checks.module";
import {StorageModule} from "../storage/storage.module";
import {ApplicationsController} from "./applications.controller";
import {ApplicationsService} from "./applications.service";

@Module({
  imports: [StorageModule, ChecksModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService]
})
export class ApplicationsModule {}
