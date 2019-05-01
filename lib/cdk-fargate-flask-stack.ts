import cdk = require('@aws-cdk/cdk');
import ec2 = require("@aws-cdk/aws-ec2");
import ecs = require("@aws-cdk/aws-ecs");
import elbv2 = require("@aws-cdk/aws-elasticloadbalancingv2");
//import rds = require("@aws-cdk/aws-rds");

const {ApplicationProtocol} = elbv2;

export class CdkFargateFlaskStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    // Create VPC and Fargate Cluster
    const vpc = new ec2.VpcNetwork(this, "FargateVPC", {
      maxAZs: 3
    });

    const cluster = new ecs.Cluster(this, "Cluster", {vpc});

    // Create task definition
    const fargateTaskDefinition = new ecs.FargateTaskDefinition(this, "FargateTaskDef", {
      memoryMiB: "512",
      cpu: "256"
    });

    // create a task definition with CloudWatch Logs
    const logging = new ecs.AwsLogDriver(this, "AppLogging", {
      streamPrefix: "myapp",
    })

    // Create container from local `Dockerfile`
    const appContainer = fargateTaskDefinition.addContainer("Container", {
        image: ecs.ContainerImage.fromAsset(this, "Image", {
            directory: "./flask-app"
        }),
        logging
    });
    // Set port mapping
    appContainer.addPortMappings({
        containerPort: 80
    });

    // Create service
    const service = new ecs.FargateService(this, "Service", {
      cluster,
      taskDefinition: fargateTaskDefinition,
      desiredCount: 2
    });

    // Configure task auto-scaling      
    const scaling = service.autoScaleTaskCount({
      maxCapacity: 5
    });
    scaling.scaleOnCpuUtilization("CpuScaling", {
      targetUtilizationPercent: 70
    });

    // Create service with built-in load balancer
    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, "AppLB", {
      vpc,
      internetFacing: true
    });
    // Allow incoming connections
    loadBalancer.connections.allowFromAnyIPv4(new ec2.TcpPort(80), "Allow inbound HTTP");

    // Create a listener and listen to incoming requests
    const listener = loadBalancer.addListener("Listener", {
      port: 80,
      protocol: ApplicationProtocol.Http
    });
    listener.addTargets("ServiceTarget", {
      port: 80,
      protocol: ApplicationProtocol.Http,
      targets: [service]
    });
/*
    const dbCluster = new rds.DatabaseCluster(this, "MyRdsDb", {
      defaultDatabaseName: "MyAuroraDatabase",
      masterUser: {
        username: "admin"
      },
      engine: rds.DatabaseClusterEngine.Aurora,
      instanceProps: {
        instanceType: new ec2.InstanceTypePair(
          ec2.InstanceClass.Burstable2,
          ec2.InstanceSize.Small
        ),
        vpc: vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.Public
        }
      }
    });    
*/
  }
}
