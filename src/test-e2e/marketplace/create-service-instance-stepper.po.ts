import { StepperComponent } from '../po/stepper.po';
import { by, element, promise, browser } from 'protractor';


export class CreateServiceInstanceStepper extends StepperComponent {

  private cfFieldName = 'cf';
  private orgFieldName = 'org';
  private spaceFieldName = 'space';
  private serviceFieldName = 'service';
  private serviceNameFieldName = 'name';

  constructor() {
    super();
  }

  waitForStepCloudFoundry = () => {
    return super.waitForStep('Cloud Foundry');
  }

  setCf = (cfName: string) => {
    return this.getStepperForm().fill({ [this.cfFieldName]: cfName });
  }

  setOrg = (orgName: string) => {
    return this.getStepperForm().fill({ [this.orgFieldName]: orgName });
  }

  setSpace = (spaceName: string) => {
    return this.getStepperForm().fill({ [this.spaceFieldName]: spaceName });
  }
  setService = (serviceName: string) => {
    return this.getStepperForm().fill({ [this.serviceFieldName]: serviceName });
  }

  setServiceName = (serviceInstanceName: string) => {
    browser.sleep(5000);
    return this.getStepperForm().fill({ [this.serviceNameFieldName]: serviceInstanceName });
  }

}
