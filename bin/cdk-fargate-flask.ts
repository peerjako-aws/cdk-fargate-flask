#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/cdk');
import { CdkFargateFlaskStack } from '../lib/cdk-fargate-flask-stack';

const app = new cdk.App();
new CdkFargateFlaskStack(app, 'CdkFargateFlaskStack');
