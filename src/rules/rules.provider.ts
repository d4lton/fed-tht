import {Injectable} from "@nestjs/common";
import {DrinkType, RulesForType} from "../core";
import {loadMaltRules, loadSpiritsRules, loadWineRules} from "./rules-loader";

/**
 * Hands the check the rules for a drink type. Each type's rules are loaded and
 * checked once at startup, from its own YAML data — a new type is added by
 * dropping in its rule files and a loader, nothing more.
 */
@Injectable()
export class RulesProvider {

  private readonly byType: Record<DrinkType, RulesForType> = {
    "distilled-spirits": loadSpiritsRules(),
    wine: loadWineRules(),
    "malt-beverage": loadMaltRules()
  };

  forType(type: DrinkType): RulesForType {
    const rules = this.byType[type];
    if (!rules) {
      throw new Error(`no rules compiled for drink type "${type}"`);
    }
    return rules;
  }

}
