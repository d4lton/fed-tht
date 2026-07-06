import {randomUUID} from "crypto";
import {Injectable} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import {CheckResult} from "./check-result";
import {CheckRun} from "./check-run.entity";

/** Appends to (and reads) the running log of checks. */
@Injectable()
export class ChecksLogStore {

  constructor(
    @InjectRepository(CheckRun)
    private readonly repo: Repository<CheckRun>
  ) {}

  async append(result: CheckResult): Promise<void> {
    const entry = this.repo.create({
      id: randomUUID(),
      applicationId: result.application,
      outcome: result.outcome,
      ranAt: result.ranAt,
      tookMs: result.tookMs,
      model: result.model,
      assisted: result.assisted
    });
    await this.repo.save(entry);
  }

  list(): Promise<CheckRun[]> {
    return this.repo.find({order: {createdAt: "DESC"}});
  }

}
