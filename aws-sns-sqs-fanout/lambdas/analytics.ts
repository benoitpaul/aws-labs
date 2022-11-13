import { SQSHandler, SQSBatchItemFailure, SQSBatchResponse } from "aws-lambda";

export const handler: SQSHandler = async (event, context) => {
  const batchItemFailures: SQSBatchItemFailure[] = [];
  for (const record of event.Records) {
    try {
      // process the record
      console.log("Analytics Record: %j", record);
      const body = JSON.parse(record.body) as {
        Subject: string;
        Message: string;
      };
      const message = { subject: body.Subject, message: body.Message };
      console.log("Analytics Message: %j", message);

      if (message.message === "error") {
        throw new Error("Message is an error");
      }
    } catch (err) {
      console.log("Error", err);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  const response: SQSBatchResponse = { batchItemFailures };
  console.log("Response", response);
  return response;
};
