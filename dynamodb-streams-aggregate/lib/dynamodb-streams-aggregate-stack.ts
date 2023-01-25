import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as logs from "aws-cdk-lib/aws-logs";
import { join } from "path";

export class DynamodbStreamsAggregateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const invoiceTransactionsTable = new dynamodb.Table(
      this,
      "InvoiceTransactions",
      {
        partitionKey: {
          name: "InvoiceNumber",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: "TransactionId",
          type: dynamodb.AttributeType.STRING,
        },
        stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }
    );

    const invoiceTotalTable = new dynamodb.Table(this, "InvoiceTotal", {
      partitionKey: {
        name: "InvoiceNumber",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const updateInvoiceTotal = new nodejs.NodejsFunction(
      this,
      `UpdateInvoiceTotal`,
      {
        entry: join(__dirname, "..", "functions", "update-invoice-total.ts"),
        handler: "handler",
        logRetention: logs.RetentionDays.ONE_DAY,
        environment: {
          INVOICE_TOTAL_TABLE: invoiceTotalTable.tableName,
        },
      }
    );

    invoiceTransactionsTable.grantStreamRead(updateInvoiceTotal);
    invoiceTotalTable.grantWriteData(updateInvoiceTotal);

    updateInvoiceTotal.addEventSource(
      new lambdaEventSources.DynamoEventSource(invoiceTransactionsTable, {
        startingPosition: lambda.StartingPosition.LATEST,
      })
    );
  }
}
