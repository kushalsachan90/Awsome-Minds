import {
  EC2Client,
  RebootInstancesCommand,
  StopInstancesCommand,
  StartInstancesCommand,
  ModifyInstanceAttributeCommand,
  DescribeInstancesCommand,
  RunInstancesCommand,
  CreateTagsCommand,
} from "@aws-sdk/client-ec2";

const ec2Client = new EC2Client({});

const EC2_FIX_ACTIONS = [
  "REBOOT_INSTANCE",
  "STOP_INSTANCE",
  "RESIZE_INSTANCE",
  "RESTART_WITH_ROLLBACK_AMI",
];

// arn:aws:ec2:region:account-id:instance/i-xxxxxxxx
const parseInstanceIdFromArn = (arn) => {
  if (!arn) {
    throw new Error("Missing resourceArn");
  }

  const parts = arn.split(":");

  if (
    parts.length < 6 ||
    parts[2] !== "ec2" ||
    !parts[5].startsWith("instance/")
  ) {
    throw new Error(`Unable to parse EC2 instance ID from ARN: ${arn}`);
  }

  return parts[5].substring("instance/".length);
};

const describeInstance = async (instanceId) => {
  const response = await ec2Client.send(
    new DescribeInstancesCommand({
      InstanceIds: [instanceId],
    }),
  );

  const instance = response.Reservations?.[0]?.Instances?.[0];

  if (!instance) {
    throw new Error(`Instance not found: ${instanceId}`);
  }

  return instance;
};

export const handleEc2Fix = async (event) => {
  const { action, parameters = {} } = event.fix || {};

  if (event.resourceType !== "EC2") {
    throw new Error(`Unsupported resource type: ${event.resourceType}`);
  }
  if (!EC2_FIX_ACTIONS.includes(action)) {
    throw new Error(`Unsupported EC2 action: ${action}`);
  }

  switch (action) {
    case "REBOOT_INSTANCE":
      return await rebootInstance(event, parameters);

    case "STOP_INSTANCE":
      return await stopInstance(event, parameters);

    case "RESIZE_INSTANCE":
      return await resizeInstance(event, parameters);

    case "RESTART_WITH_ROLLBACK_AMI":
      return await restartWithRollbackAmi(event, parameters);

    default:
      throw new Error(`Unsupported EC2 action: ${action}`);
  }
};

const rebootInstance = async (event, parameters) => {
  const { resourceArn, incidentId } = event;

  const instanceId = parseInstanceIdFromArn(resourceArn);

  const instance = await describeInstance(instanceId);

  const state = instance.State?.Name;

  if (state !== "running") {
    throw new Error(
      `Cannot reboot ${instanceId}: ` + `current state is "${state}"`,
    );
  }

  console.log("Rebooting EC2 instance:", {
    instanceId,
  });

  await ec2Client.send(
    new RebootInstancesCommand({
      InstanceIds: [instanceId],
    }),
  );

  return {
    success: true,
    incidentId,
    actionTaken: "REBOOT_INSTANCE",
    instanceId,
    status: "REQUESTED",
    nextStep: "WAIT_AND_CHECK_INSTANCE",
  };
};

const stopInstance = async (event, parameters) => {
    const { resourceArn, incidentId } = event;

    const instanceId = parseInstanceIdFromArn(resourceArn);

    const instance = await describeInstance(instanceId);

    const state = instance.State?.Name;

    if (state === "stopped") {
        return {
            success: true,
            incidentId,
            actionTaken: "STOP_INSTANCE",
            instanceId,
            status: "ALREADY_STOPPED",
        };
    }

    if (state === "stopping") {
        return {
            success: true,
            incidentId,
            actionTaken: "STOP_INSTANCE",
            instanceId,
            status: "STOP_ALREADY_REQUESTED",
            nextStep: "WAIT_AND_CHECK_STOPPED",
        };
    }

    if (state !== "running") {
        throw new Error(
            `Cannot stop ${instanceId}: ` + `current state is "${state}"`,
        );
    }


    console.log("Stopping EC2 instance:", {
        instanceId,
    });

    await ec2Client.send(
        new StopInstancesCommand({
            InstanceIds: [instanceId],
        }),
    );

    return {
        success: true,
        incidentId,
        actionTaken: "STOP_INSTANCE",
        instanceId,
        status: "REQUESTED",
        nextStep: "WAIT_AND_CHECK_STOPPED",
    };
};

const resizeInstance = async (event, parameters) => {
    const { resourceArn, incidentId } = event;

    const { targetInstanceType } = parameters;

    const instanceId = parseInstanceIdFromArn(resourceArn);

    if (!targetInstanceType || typeof targetInstanceType !== "string") {
        throw new Error(
            `Missing or invalid targetInstanceType: ` + `${targetInstanceType}`,
        );
    }

    const instance = await describeInstance(instanceId);

    const currentInstanceType = instance.InstanceType;

    const state = instance.State?.Name;

    if (currentInstanceType === targetInstanceType) {
        return {
            success: true,
            incidentId,
            actionTaken: "RESIZE_INSTANCE",
            instanceId,
            previousInstanceType: currentInstanceType,
            newInstanceType: targetInstanceType,
            status: "ALREADY_APPLIED",
        };
    }

    if (state === "running") {
        console.log("Stopping EC2 instance before resize:", {
            instanceId,
            currentInstanceType,
            targetInstanceType,
        });

        await ec2Client.send(
            new StopInstancesCommand({
                InstanceIds: [instanceId],
            }),
        );

        return {
            success: true,
            incidentId,
            actionTaken: "RESIZE_INSTANCE",
            instanceId,
            previousInstanceType: currentInstanceType,
            newInstanceType: targetInstanceType,
            status: "STOP_REQUESTED",
            nextStep: "WAIT_FOR_STOP_THEN_RESIZE",
        };
    }

    if (state === "stopping") {
        return {
            success: true,
            incidentId,
            actionTaken: "RESIZE_INSTANCE",
            instanceId,
            previousInstanceType: currentInstanceType,
            newInstanceType: targetInstanceType,
            status: "WAITING_FOR_STOP",
            nextStep: "WAIT_FOR_STOP_THEN_RESIZE",
        };
    }

    if (state !== "stopped") {
        throw new Error(
            `Cannot resize ${instanceId}: ` + `current state is "${state}"`,
        );
    }

    console.log("Resizing EC2 instance:", {
        instanceId,
        from: currentInstanceType,
        to: targetInstanceType,
    });

    await ec2Client.send(
        new ModifyInstanceAttributeCommand({
            InstanceId: instanceId,
            InstanceType: {
                Value: targetInstanceType,
            },
        }),
    );

    await ec2Client.send(
        new StartInstancesCommand({
            InstanceIds: [instanceId],
        }),
    );

    return {
        success: true,
        incidentId,
        actionTaken: "RESIZE_INSTANCE",
        instanceId,
        previousInstanceType: currentInstanceType,
        newInstanceType: targetInstanceType,
        status: "REQUESTED",
        nextStep: "WAIT_AND_CHECK_INSTANCE",
    };
};

const restartWithRollbackAmi = async (event, parameters) => {
    const { resourceArn, incidentId } = event;

    const { targetAmiId } = parameters;

    const instanceId = parseInstanceIdFromArn(resourceArn);

    if (!targetAmiId || !/^ami-[a-f0-9]{8,17}$/.test(targetAmiId)) {
        throw new Error(`Invalid or missing targetAmiId: ${targetAmiId}`);
    }

    const original = await describeInstance(instanceId);

    const state = original.State?.Name;

    if (!["running", "stopped"].includes(state)) {
        throw new Error(
            `Cannot rollback ${instanceId}: ` + `current state is "${state}"`,
        );
    }


    const existingReplacement = await findExistingReplacement(
        incidentId,
        instanceId,
    );

    if (existingReplacement) {
        return {
            success: true,
            incidentId,
            actionTaken: "RESTART_WITH_ROLLBACK_AMI",
            originalInstanceId: instanceId,
            newInstanceId: existingReplacement,
            targetAmiId,
            status: "ALREADY_LAUNCHED",
            nextStep: "WAIT_AND_HEALTH_CHECK_REPLACEMENT",
        };
    }

    const securityGroupIds = (original.SecurityGroups || [])
        .map((sg) => sg.GroupId)
        .filter(Boolean);


    console.log("Launching EC2 replacement from rollback AMI:", {
        originalInstanceId: instanceId,
        targetAmiId,
    });

    const runResponse = await ec2Client.send(
        new RunInstancesCommand({
            ImageId: targetAmiId,

            InstanceType: original.InstanceType,

            MinCount: 1,
            MaxCount: 1,

            SubnetId: original.SubnetId,

            SecurityGroupIds:
                securityGroupIds.length > 0 ? securityGroupIds : undefined,

            KeyName: original.KeyName,

            IamInstanceProfile: original.IamInstanceProfile?.Arn
                ? {
                    Arn: original.IamInstanceProfile.Arn,
                }
                : undefined,
        }),
    );

    const newInstanceId = runResponse.Instances?.[0]?.InstanceId;

    if (!newInstanceId) {
        throw new Error("RunInstances did not return a new instance ID");
    }

    await ec2Client.send(
        new CreateTagsCommand({
            Resources: [newInstanceId],

            Tags: [
                {
                    Key: "SelfHealing:IncidentId",
                    Value: incidentId,
                },
                {
                    Key: "SelfHealing:ReplacesInstance",
                    Value: instanceId,
                },
                {
                    Key: "SelfHealing:Action",
                    Value: "RESTART_WITH_ROLLBACK_AMI",
                },
            ],
        }),
    );

    // --------------------------------------------------------
    // Do not wait here.
    //
    // Step Functions should:
    // 1. Wait
    // 2. Check replacement
    // 3. Health check
    // 4. Stop original only after success
    // --------------------------------------------------------

    return {
        success: true,
        incidentId,
        actionTaken: "RESTART_WITH_ROLLBACK_AMI",
        originalInstanceId: instanceId,
        newInstanceId,
        targetAmiId,
        status: "REQUESTED",
        nextStep: "WAIT_AND_HEALTH_CHECK_REPLACEMENT",
    };
};

const findExistingReplacement = async (incidentId, originalInstanceId) => {
  const response = await ec2Client.send(
    new DescribeInstancesCommand({
      Filters: [
        {
          Name: "tag:SelfHealing:IncidentId",
          Values: [incidentId],
        },
        {
          Name: "tag:SelfHealing:ReplacesInstance",
          Values: [originalInstanceId],
        },
        {
          Name: "tag:SelfHealing:Action",
          Values: ["RESTART_WITH_ROLLBACK_AMI"],
        },
        {
          Name: "instance-state-name",
          Values: ["pending", "running", "stopping", "stopped"],
        },
      ],
    }),
  );

  const instance = response.Reservations?.flatMap(
    (reservation) => reservation.Instances || [],
  )?.find(Boolean);

  return instance?.InstanceId || null;
};
