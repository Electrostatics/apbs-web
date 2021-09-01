import React from 'react';
import { Steps } from 'antd';

const { Step } = Steps;

export enum WORKFLOW_STEP {
  PDB2PQR = 0,
  STATUS_PDB2PQR = 1,
  APBS = 2,
  STATUS_APBS = 3,
}

export const WORKFLOW_TYPES = {
  PDB2PQR: ["PDB2PQR Configuration", "PDB2PQR Job Status", "APBS Configuration", "APBS Job Status", "Visualization"],
  APBS: ["PDB2PQR Configuration", "PDB2PQR Job Status", "APBS Configuration", "APBS Job Status", "Visualization"],
  APBS_ONLY: ["APBS Configuration", "APBS Job Status", "Visualization"],
}

interface WorkflowHeaderProps {
  currentStep: number;
  stepList: Array<string>;
  // step: WORKFLOW_STEP;
  // postPDB2PQR?: Boolean;
}

// TODO: 2021/08/23, Elvis - Utilize commented props to build dynamic WorkflowHeader component. Requires refactor of <App> and <ServerRouter> components
export default class WorkflowHeader extends React.Component<WorkflowHeaderProps> {
  render(): React.ReactNode {
    // const post_pdb2pqr: Boolean = this.props.postPDB2PQR ? this.props.postPDB2PQR : false

    const step_components: Array<React.ReactNode> = []

    for( let item of this.props.stepList ){
      step_components.push(
        <Step title={item}/>
      )
    }

    return (
      <Steps
        type="navigation"
        size="small"
        current={this.props.currentStep}
      >
        {step_components}
      </Steps>
    )
  }
}
