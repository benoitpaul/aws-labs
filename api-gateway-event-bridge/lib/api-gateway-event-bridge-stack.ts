import * as cdk from "aws-cdk-lib";
import * as api_gateway from "aws-cdk-lib/aws-apigateway";

import * as events from "aws-cdk-lib/aws-events";
import * as events_targets from "aws-cdk-lib/aws-events-targets";
import * as logs from "aws-cdk-lib/aws-logs";

import * as iam from "aws-cdk-lib/aws-iam";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";

export class ApiGatewayEventBridgeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const eventBus = new events.EventBus(this, "EventBus");

    const processCompleteOrder = new nodejs.NodejsFunction(
      this,
      `ProcessCompleteOrder`,
      {
        entry: join(__dirname, "..", "functions", "process-complete-order.ts"),
        handler: "handler",
        logRetention: logs.RetentionDays.ONE_DAY,
      }
    );

    const processCompleteOrderRule = new events.Rule(
      this,
      "ProcessCompleteOrderRule",
      {
        eventBus,
        eventPattern: {
          detailType: ["order.completed"],
        },
      }
    );

    processCompleteOrderRule.addTarget(
      new events_targets.LambdaFunction(processCompleteOrder)
    );

    const processPendingOrder = new nodejs.NodejsFunction(
      this,
      `ProcessPending}Order`,
      {
        entry: join(__dirname, "..", "functions", "process-pending-order.ts"),
        handler: "handler",
        logRetention: logs.RetentionDays.ONE_DAY,
      }
    );

    const processPendingOrderRule = new events.Rule(
      this,
      "ProcessPendingOrderRule",
      {
        eventBus,
        eventPattern: {
          detailType: ["order.pending"],
        },
      }
    );

    processPendingOrderRule.addTarget(
      new events_targets.LambdaFunction(processPendingOrder)
    );

    const credentialsRole = new iam.Role(this, "CredentialsRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      inlinePolicies: {
        PutEvents: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ["events:PutEvents"],
              effect: iam.Effect.ALLOW,
              resources: [eventBus.eventBusArn],
            }),
          ],
        }),
      },
    });

    const integration = new api_gateway.AwsIntegration({
      service: "events",
      action: "PutEvents",
      integrationHttpMethod: "POST",
      options: {
        credentialsRole,
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": `{ "requestId": "$context.requestId" }`,
            },
          },
        ],
        requestTemplates: {
          "application/json": `
          #set($context.requestOverride.header.X-Amz-Target = "AWSEvents.PutEvents")
          #set($context.requestOverride.header.Content-Type = "application/x-amz-json-1.1")
          #set($inputRoot = $input.path('$'))
          {
            "Entries": [
              {
                "Detail": "$util.escapeJavaScript($input.json('$.payload')).replaceAll("\\'","'")",
                "DetailType": "$util.escapeJavaScript($inputRoot.destination).replaceAll("\\'","'")",
                "EventBusName": "${eventBus.eventBusArn}",
                "Source": "$util.escapeJavaScript($inputRoot.source).replaceAll("\\'","'")"
              }
            ]
          }
        `,
        },
      },
    });

    const api = new api_gateway.RestApi(this, "ApiGateway");
    api.root.addResource("orders").addMethod("POST", integration, {
      apiKeyRequired: true,
      methodResponses: [{ statusCode: "200" }],
    });
  }
}
