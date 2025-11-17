import { APIErrorResponse } from "./api-response";

export class APIError extends Error {
  response: APIErrorResponse;

  constructor(message: string, response: APIErrorResponse) {
    super(message);
    this.response = response;
  }
}