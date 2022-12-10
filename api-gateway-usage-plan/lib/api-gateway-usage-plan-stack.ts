import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import {
  MockIntegration,
  PassthroughBehavior,
} from "aws-cdk-lib/aws-apigateway";

export class ApiGatewayUsagePlanStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create the API
    const api = new apigateway.RestApi(this, "Api");
    api.root.addResource("cats").addMethod(
      "GET",
      new MockIntegration({
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": `{
                "id": "$context.requestId",
                "result": "cats",
            }`,
            },
          },
        ],
        passthroughBehavior: PassthroughBehavior.NEVER,
        requestTemplates: {
          "application/json": '{ "statusCode": 200 }',
        },
      }),
      {
        apiKeyRequired: true,
        methodResponses: [{ statusCode: "200" }],
      }
    );

    const dogsMethod = api.root.addResource("dogs").addMethod(
      "GET",
      new MockIntegration({
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": `{
                "id": "$context.requestId",
                "result": "dogs",
            }`,
            },
          },
        ],
        passthroughBehavior: PassthroughBehavior.NEVER,
        requestTemplates: {
          "application/json": '{ "statusCode": 200 }',
        },
      }),
      {
        // apiKeyRequired: true,
        methodResponses: [{ statusCode: "200" }],
      }
    );

    /*
    const postMethod = api.root.addMethod(
      "POST",
      new MockIntegration({
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": `{
                "id": "$context.requestId",
                "httpMethod": "$context.httpMethod",
                "createdAt": $context.requestTimeEpoch,
                "updatedAt": $context.requestTimeEpoch
            }`,
            },
            // Populating the CORS headers with specific values.
            responseParameters: {
              "method.response.header.Access-Control-Allow-Methods":
                "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
              "method.response.header.Access-Control-Allow-Headers":
                "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
              "method.response.header.Access-Control-Allow-Origin": "'*'",
            },
          },
        ],
        passthroughBehavior: PassthroughBehavior.NEVER,
        requestTemplates: {
          "application/json": '{ "statusCode": 200 }',
        },
      }),
      {
        apiKeyRequired: true,
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Headers": true,
            },
          },
        ],
      }
    );
    */

    // Create the basic usage plan
    const basicUsagePlan = api.addUsagePlan("BasicUsagePlan", {
      name: "Basic",
      throttle: {
        rateLimit: 1,
        burstLimit: 2,
      },
      quota: {
        limit: 5,
        period: apigateway.Period.DAY,
      },
    });

    basicUsagePlan.addApiStage({
      stage: api.deploymentStage,
      throttle: [
        {
          method: dogsMethod,
          throttle: {
            rateLimit: 10,
            burstLimit: 5,
          },
        },
      ],
    });

    // Create the premium usage plan
    const premiumUsagePlan = api.addUsagePlan("PremiumUsagePlan", {
      name: "Premium",
      throttle: {
        rateLimit: 20,
        burstLimit: 5,
      },
      quota: {
        limit: 100000,
        period: apigateway.Period.DAY,
      },
    });

    premiumUsagePlan.addApiStage({
      stage: api.deploymentStage,
    });

    const basicApikey = api.addApiKey("BasicApiKey");
    basicUsagePlan.addApiKey(basicApikey);

    const premiumApikey = api.addApiKey("PremiumApiKey");
    premiumUsagePlan.addApiKey(premiumApikey);
  }
}
