import {Controller, Get} from "@nestjs/common";
import {REASON_TEXTS} from "./reason-texts";

/**
 * Serves the code-to-text list so whatever shows a result can turn short reason
 * codes (like `warning-missing`) into readable sentences.
 */
@Controller("reason-texts")
export class ReasonTextsController {

  @Get()
  list(): Record<string, string> {
    return REASON_TEXTS;
  }

}
