import { SQSHandler, SQSBatchItemFailure } from "aws-lambda";
import { deleteSQSRecord } from "./utils";

export const handler: SQSHandler = async (event, context) => {
  for (const record of event.Records) {
    console.log("Confirmation SMS Record: %j", record);
    const body = JSON.parse(record.body) as {
      Subject: string;
      Message: string;
    };
    const message = { subject: body.Subject, message: body.Message };
    console.log("Confirmation SMS Message: %j", message);

    // manually delete the record from the queue
    await deleteSQSRecord(record);
  }
};
