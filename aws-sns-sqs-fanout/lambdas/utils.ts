import { SQSRecord } from "aws-lambda";
import { config, SQS } from "aws-sdk";

config.update({ region: "us-east-1" });
const sqs = new SQS({ apiVersion: "2012-11-05" });
console.log(`apiVersion: ${sqs.config.apiVersion}`);

export const getQueueUrl = (record: SQSRecord): string => {
  const splits = record.eventSourceARN.split(":");
  const service = splits[2];
  const region = splits[3];
  const accountId = splits[4];
  const queueName = splits[5];
  const queueUrl = `https://${service}.${region}.amazonaws.com/${accountId}/${queueName}`;
  console.log(`queue url: ${queueUrl}`);
  return queueUrl;
};

export const deleteSQSRecord = async (record: SQSRecord) => {
  const params = {
    QueueUrl: getQueueUrl(record),
    ReceiptHandle: record.receiptHandle,
  };
  const deletedMessage = await sqs.deleteMessage(params).promise();
  console.log("Deleted message", deletedMessage);
};
