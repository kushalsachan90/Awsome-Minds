import {
  DynamoDBClient,
  DescribeTableCommand,
  UpdateTableCommand,
  DescribeContinuousBackupsCommand,
  UpdateContinuousBackupsCommand,
  RestoreTableToPointInTimeCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";

const dynamoDbClient = new DynamoDBClient({});

const DYNAMODB_FIX_ACTIONS = [
  "UPDATE_PROVISIONED_CAPACITY",
  "ENABLE_POINT_IN_TIME_RECOVERY",
  "RESTORE_TABLE",
  "DELETE_ITEM",
];

// arn:aws:dynamodb:region:account-id:table/table-name
const parseTableNameFromArn = (arn) => {
  if (!arn) {
    throw new Error("Missing resourceArn");
  }

  const parts = arn.split(":");

  if (
    parts.length < 6 ||
    parts[2] !== "dynamodb" ||
    !parts[5].startsWith("table/")
  ) {
    throw new Error(`Unable to parse DynamoDB table name from ARN: ${arn}`);
  }

  return parts[5].substring("table/".length);
};

export const handleDynamoDbFix = async (event) => {
    const { action, parameters = {} } = event.fix || {};

    if (event.resourceType !== "DynamoDB") {
        throw new Error(`Unsupported resource type: ${event.resourceType}`);
    }

    if (!DYNAMODB_FIX_ACTIONS.includes(action)) {
        throw new Error(`Unsupported DynamoDB action: ${action}`);
    }


    switch (action) {
        case "UPDATE_PROVISIONED_CAPACITY":
            return await updateProvisionedCapacity(event, parameters);

        case "ENABLE_POINT_IN_TIME_RECOVERY":
            return await enablePointInTimeRecovery(event, parameters);

        case "RESTORE_TABLE":
            return await restoreTable(event, parameters);

        case "DELETE_ITEM":
            return await deleteItem(event, parameters);

        default:
            throw new Error(`Unsupported DynamoDB action: ${action}`);
    }
};


const updateProvisionedCapacity = async (event, parameters) => {
    const { resourceArn, incidentId } = event;

    const { readCapacityUnits, writeCapacityUnits } = parameters;

    const tableName = parseTableNameFromArn(resourceArn);

    if (!Number.isInteger(readCapacityUnits) || readCapacityUnits < 1) {
        throw new Error(`Invalid readCapacityUnits: ${readCapacityUnits}`);
    }

    if (!Number.isInteger(writeCapacityUnits) || writeCapacityUnits < 1) {
        throw new Error(`Invalid writeCapacityUnits: ${writeCapacityUnits}`);
    }

    const tableResponse = await dynamoDbClient.send(
        new DescribeTableCommand({
            TableName: tableName,
        }),
    );

    const table = tableResponse.Table;

    if (!table) {
        throw new Error(`DynamoDB table not found: ${tableName}`);
    }

    if (table.BillingModeSummary?.BillingMode === "PAY_PER_REQUEST") {
        throw new Error(
            `Table ${tableName} uses PAY_PER_REQUEST billing mode. ` +
            `Provisioned capacity cannot be updated.`,
        );
    }

    const previousReadCapacity = table.ProvisionedThroughput?.ReadCapacityUnits;

    const previousWriteCapacity = table.ProvisionedThroughput?.WriteCapacityUnits;

    if (
        previousReadCapacity === readCapacityUnits &&
        previousWriteCapacity === writeCapacityUnits
    ) {
        return {
            success: true,
            incidentId,
            actionTaken: "UPDATE_PROVISIONED_CAPACITY",
            tableName,
            previousReadCapacityUnits: previousReadCapacity,
            previousWriteCapacityUnits: previousWriteCapacity,
            targetReadCapacityUnits: readCapacityUnits,
            targetWriteCapacityUnits: writeCapacityUnits,
            status: "ALREADY_APPLIED",
        };
    }

    console.log("Updating DynamoDB provisioned capacity:", {
        tableName,
        from: {
            readCapacityUnits: previousReadCapacity,
            writeCapacityUnits: previousWriteCapacity,
        },
        to: {
            readCapacityUnits,
            writeCapacityUnits,
        },
    });

    await dynamoDbClient.send(
        new UpdateTableCommand({
            TableName: tableName,
            ProvisionedThroughput: {
                ReadCapacityUnits: readCapacityUnits,
                WriteCapacityUnits: writeCapacityUnits,
            },
        }),
    );

    return {
        success: true,
        incidentId,
        actionTaken: "UPDATE_PROVISIONED_CAPACITY",
        tableName,
        previousReadCapacityUnits: previousReadCapacity,
        previousWriteCapacityUnits: previousWriteCapacity,
        targetReadCapacityUnits: readCapacityUnits,
        targetWriteCapacityUnits: writeCapacityUnits,
        status: "REQUESTED",
        nextStep: "WAIT_AND_CHECK_TABLE",
    };
};

const enablePointInTimeRecovery = async (event, parameters) => {
    const { resourceArn, incidentId } = event;

    const tableName = parseTableNameFromArn(resourceArn);


    const backupResponse = await dynamoDbClient.send(
        new DescribeContinuousBackupsCommand({
            TableName: tableName,
        }),
    );

    const pitrDescription =
        backupResponse.ContinuousBackupsDescription?.PointInTimeRecoveryDescription;

    const pitrEnabled = pitrDescription?.PointInTimeRecoveryStatus === "ENABLED";

    if (pitrEnabled) {
        return {
            success: true,
            incidentId,
            actionTaken: "ENABLE_POINT_IN_TIME_RECOVERY",
            tableName,
            status: "ALREADY_APPLIED",
        };
    }

    console.log("Enabling DynamoDB Point-in-Time Recovery:", {
        tableName,
    });

    await dynamoDbClient.send(
        new UpdateContinuousBackupsCommand({
            TableName: tableName,
            PointInTimeRecoverySpecification: {
                PointInTimeRecoveryEnabled: true,
            },
        }),
    );
    return {
        success: true,
        incidentId,
        actionTaken: "ENABLE_POINT_IN_TIME_RECOVERY",
        tableName,
        status: "COMPLETED",
    };
};

const restoreTable = async (event, parameters) => {
    const { resourceArn, incidentId } = event;

    const { targetTableName, restoreTime } = parameters;

    const sourceTableName = parseTableNameFromArn(resourceArn);

    if (!targetTableName || typeof targetTableName !== "string") {
        throw new Error("Missing targetTableName");
    }

    if (sourceTableName === targetTableName) {
        throw new Error("targetTableName must be different from source table");
    }

    if (!restoreTime) {
        throw new Error("Missing restoreTime");
    }

    const restoreDate = new Date(restoreTime);

    if (Number.isNaN(restoreDate.getTime())) {
        throw new Error(`Invalid restoreTime: ${restoreTime}`);
    }

    await dynamoDbClient.send(
        new DescribeTableCommand({
            TableName: sourceTableName,
        }),
    );
    console.log("Restoring DynamoDB table:", {
        sourceTableName,
        targetTableName,
        restoreTime,
    });

    await dynamoDbClient.send(
        new RestoreTableToPointInTimeCommand({
            SourceTableName: sourceTableName,
            TargetTableName: targetTableName,
            RestoreDateTime: restoreDate,
        }),
    );
    return {
        success: true,
        incidentId,
        actionTaken: "RESTORE_TABLE",
        sourceTableName,
        targetTableName,
        restoreTime,
        status: "REQUESTED",
        nextStep: "WAIT_AND_CHECK_TABLE",
    };
};

const deleteItem = async (event, parameters) => {
    const { resourceArn, incidentId } = event;

    const { key } = parameters;

    const tableName = parseTableNameFromArn(resourceArn);
    if (
        !key ||
        typeof key !== "object" ||
        Array.isArray(key) ||
        Object.keys(key).length === 0
    ) {
        throw new Error("Missing or invalid DynamoDB key");
    }

    await dynamoDbClient.send(
        new DescribeTableCommand({
            TableName: tableName,
        }),
    );

    console.log("Deleting DynamoDB item:", {
        tableName,
        key,
    });

    await dynamoDbClient.send(
        new DeleteItemCommand({
            TableName: tableName,
            Key: key,
        }),
    );

    return {
        success: true,
        incidentId,
        actionTaken: "DELETE_ITEM",
        tableName,
        key,
        status: "COMPLETED",
    };
};
