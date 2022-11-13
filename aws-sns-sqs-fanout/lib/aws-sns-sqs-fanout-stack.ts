import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as logs from "aws-cdk-lib/aws-logs";
import { join } from "path";
import { DeadLetterQueue } from "aws-cdk-lib/aws-sqs";

export class AwsSnsSqsFanoutStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const deadLetterQueue = this.createQueue(
      "DLQ",
      join(__dirname, "..", "lambdas", "dead-letter.ts")
    );

    const analyticsQueue = this.createQueue(
      "Analytics",
      join(__dirname, "..", "lambdas", "analytics.ts"),
      deadLetterQueue
    );

    const confirmationEmailQueue = this.createQueue(
      "ConfirmationEmail",
      join(__dirname, "..", "lambdas", "confirmation-email.ts")
    );

    const confirmationSMSQueue = this.createQueue(
      "ConfirmationSMS",
      join(__dirname, "..", "lambdas", "confirmation-sms.ts")
    );

    const topic = new sns.Topic(this, "Topic", {
      displayName: "Subscription topic",
    });

    topic.addSubscription(new subscriptions.SqsSubscription(analyticsQueue));
    topic.addSubscription(
      new subscriptions.SqsSubscription(confirmationEmailQueue, {
        filterPolicy: {
          confirmationType: sns.SubscriptionFilter.stringFilter({
            allowlist: ["EMAIL"],
          }),
        },
      })
    );
    topic.addSubscription(
      new subscriptions.SqsSubscription(confirmationSMSQueue, {
        filterPolicy: {
          confirmationType: sns.SubscriptionFilter.stringFilter({
            allowlist: ["SMS"],
          }),
        },
      })
    );
  }

  private createQueue(
    name: string,
    lambdaPath: string,
    dlq?: sqs.IQueue
  ): sqs.IQueue {
    const deadLetterQueue: DeadLetterQueue | undefined = dlq
      ? {
          queue: dlq,
          maxReceiveCount: 3,
        }
      : undefined;

    const queue = new sqs.Queue(this, `${name}Queue`, {
      queueName: name,
      visibilityTimeout: cdk.Duration.seconds(30),
      deadLetterQueue,
    });

    const lambda = new nodejs.NodejsFunction(this, `${name}Lambda`, {
      entry: lambdaPath,
      handler: "handler",
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    lambda.addEventSource(
      new lambdaEventSources.SqsEventSource(queue, {
        batchSize: 10, // default
        maxBatchingWindow: cdk.Duration.minutes(1),
        reportBatchItemFailures: true,
      })
    );

    return queue;
  }
}
