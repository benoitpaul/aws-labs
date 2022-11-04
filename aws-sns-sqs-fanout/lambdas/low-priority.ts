import { SQSHandler, SQSBatchItemFailure } from "aws-lambda";
// import { DynamoDB } from "aws-sdk";

// const dbClient = new DynamoDB.DocumentClient();

export const handler: SQSHandler = async (event, context) => {
  const batchItemFailures: SQSBatchItemFailure[] = [];
  event.Records.forEach((record) => {
    try {
      console.log("Low Priority Record: %j", record);
      const body = JSON.parse(record.body) as {
        Subject: string;
        Message: string;
      };
      const message = { subject: body.Subject, message: body.Message };
      console.log("Low Priority Message: %j", message);
    } catch {
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  });
  return { batchItemFailures };
};
