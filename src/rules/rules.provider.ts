import {Injectable} from "@nestjs/common";
import {DrinkType, RulesForType} from "../core";
import {loadSpiritsRules} from "./rules-loader";

/**
 * Hands the check the rules for a drink type. The rules are loaded and checked
 * once at startup. Only distilled spirits are compiled for the prototype; other
 * types would get their own rule set the same way.
 */
@Injectable()
export class RulesProvider {

  private readonly spirits = loadSpiritsRules();

  forType(type: DrinkType): RulesForType {
    if (type === "distilled-spirits") {
      return this.spirits;
    }
    throw new Error(`no rules compiled for drink type "${type}"`);
  }

}
