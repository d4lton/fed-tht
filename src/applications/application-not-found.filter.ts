import {ArgumentsHost, Catch, ExceptionFilter} from "@nestjs/common";
import type {Response} from "express";
import {ApplicationNotFoundError} from "../storage/application.store";

/** Turns a "not found" from storage into a clean 404 rather than a 500. */
@Catch(ApplicationNotFoundError)
export class ApplicationNotFoundFilter implements ExceptionFilter {

  catch(exception: ApplicationNotFoundError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(404).json({
      statusCode: 404,
      error: "Not Found",
      message: exception.message
    });
  }

}
