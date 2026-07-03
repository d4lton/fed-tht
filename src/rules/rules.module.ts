import {Module} from "@nestjs/common";
import {RulesProvider} from "./rules.provider";

@Module({
  providers: [RulesProvider],
  exports: [RulesProvider]
})
export class RulesModule {}
