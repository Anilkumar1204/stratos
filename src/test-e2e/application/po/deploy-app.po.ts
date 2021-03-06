import { by, element } from 'protractor';

import { FormComponent } from '../../po/form.po';
import { ListComponent } from '../../po/list.po';
import { Page } from '../../po/page.po';
import { StepperComponent } from '../../po/stepper.po';
import { TableComponent } from '../../po/table.po';

export class DeployApplication extends Page {

  public stepper = new StepperComponent();

  public table = new TableComponent();

  constructor() {
    super(`/applications/deploy`);
  }

  public hasRouteStep() {
    return this.stepper.hasStep('Routes');
  }

  public getCommitList() {
    return new ListComponent().table;
  }

  public getOverridesForm(): FormComponent {
    return new FormComponent(element(by.css('app-deploy-application-options-step form')));
  }

}
