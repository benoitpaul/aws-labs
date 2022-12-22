import {
  CloudFormationClient,
  DescribeStacksCommand,
  ListStackResourcesCommand,
} from "@aws-sdk/client-cloudformation";
import {
  GetFunctionConfigurationCommand,
  LambdaClient,
} from "@aws-sdk/client-lambda";
import { writeFileSync } from "fs";
import { EOL } from "os";
import snakeCase from "lodash/snakeCase";

export const STACK_NAME = "IntegrationTestsStack";

export const writeEnvironmentVariables = async (
  stackName: string,
  filePath: string
) => {
  const environmentVariables = await fetchEnvironmentVariables(stackName);
  const content = environmentVariablesToString(environmentVariables);

  writeFileSync(filePath, content);
};

const environmentVariablesToString = (
  environmentVariables: Record<string, string>
) => {
  const envVars = Object.keys(environmentVariables).map((key) => {
    return `${snakeCase(key).toUpperCase()}=${environmentVariables[key]}`;
  });
  return envVars.join(EOL);
};

const fetchEnvironmentVariables = async (stackName: string) => {
  const environmentVariables = (
    await Promise.all([
      fetchOutputs(stackName),
      fetchFunctionsEnvironmentVariables(stackName),
    ])
  )
    .filter(Boolean)
    .reduce((previousValue, currentValue) => {
      const newValue = { ...previousValue, ...currentValue };
      return newValue;
    }, {});
  return environmentVariables;
};

const fetchOutputs = async (stackName: string) => {
  const client = new CloudFormationClient({});
  const describeStacks = new DescribeStacksCommand({
    StackName: stackName,
  });

  try {
    const response = await client.send(describeStacks);
    const stack = response.Stacks?.find(
      ({ StackName }) => StackName === STACK_NAME
    );

    const variables = (stack?.Outputs || []).reduce(
      (previousValue, currentValue) => {
        return {
          ...previousValue,
          ...{ [currentValue.OutputKey!]: currentValue.OutputValue },
        } as Record<string, string>;
      },
      {} as Record<string, string>
    );
    return variables;
  } catch {
    return {};
  }
};

const fetchFunctionsEnvironmentVariables = async (stackName: string) => {
  const client = new CloudFormationClient({});
  const listStackResources = new ListStackResourcesCommand({
    StackName: stackName,
  });

  const response = await client.send(listStackResources);
  const physicalResourceIds = response.StackResourceSummaries?.filter(
    ({ ResourceType }) => ResourceType === "AWS::Lambda::Function"
  ).map(({ PhysicalResourceId }) => PhysicalResourceId || "");

  if (physicalResourceIds && physicalResourceIds.length > 0) {
    const environmentVariables = (
      await Promise.all(
        physicalResourceIds.map((physicalResourceId) =>
          fetchFunctionEnvironmentVariable(physicalResourceId)
        )
      )
    )
      .filter(Boolean)
      .reduce((previousValue, currentValue) => {
        const newValue = { ...previousValue, ...currentValue };
        return newValue;
      }, {});
    return environmentVariables;
  } else {
    return {};
  }
};

const fetchFunctionEnvironmentVariable = async (functionName: string) => {
  const client = new LambdaClient({});

  const getFunctionConfiguration = new GetFunctionConfigurationCommand({
    FunctionName: functionName,
  });

  try {
    const response = await client.send(getFunctionConfiguration);
    const environmentVariables = response?.Environment?.Variables;
    return environmentVariables || {};
  } catch {
    return {};
  }
};
