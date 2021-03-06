import { ChangeDetectorRef } from '@angular/core';
import { async, ComponentFixture, inject, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Store } from '@ngrx/store';
import { BehaviorSubject, of as observableOf } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { CoreModule } from '../../../core/core.module';
import { ListView } from '../../../store/actions/list.actions';
import { AppState } from '../../../store/app-state';
import { APIResource } from '../../../store/types/api.types';
import { EndpointModel } from '../../../store/types/endpoint.types';
import { createBasicStoreModule, getInitialTestStoreState } from '../../../test-framework/store-test-helper';
import { EntityMonitorFactory } from '../../monitors/entity-monitor.factory.service';
import { PaginationMonitorFactory } from '../../monitors/pagination-monitor.factory';
import { SharedModule } from '../../shared.module';
import { ApplicationStateService } from '../application-state/application-state.service';
import { CfEndpointCardComponent } from './list-types/cf-endpoints/cf-endpoint-card/endpoint-card.component';
import { EndpointsListConfigService } from './list-types/endpoint/endpoints-list-config.service';
import { ListComponent } from './list.component';
import { ListConfig, ListViewTypes } from './list.component.types';

describe('ListComponent', () => {

  describe('basic tests', () => {

    function createBasicListConfig(): ListConfig<APIResource> {
      return {
        allowSelection: false,
        cardComponent: null,
        defaultView: 'table' as ListView,
        enableTextFilter: false,
        getColumns: () => null,
        getDataSource: () => null,
        getGlobalActions: () => null,
        getInitialised: () => null,
        getMultiActions: () => null,
        getMultiFiltersConfigs: () => null,
        getSingleActions: () => null,
        isLocal: false,
        pageSizeOptions: [1],
        text: null,
        viewType: ListViewTypes.BOTH
      };
    }

    function setup(store: AppState, config: ListConfig<APIResource>, test: (component: ListComponent<APIResource>) => void) {
      TestBed.configureTestingModule({
        imports: [
          createBasicStoreModule(store),
        ],
        providers: [
          { provide: ChangeDetectorRef, useValue: { detectChanges: () => { } } }
        ]
      });
      inject([Store, ChangeDetectorRef], (iStore: Store<AppState>, cd: ChangeDetectorRef) => {
        const component = new ListComponent<APIResource>(iStore, cd, config);
        test(component);
      })();
    }

    it('initialised - default', (done) => {
      const config = createBasicListConfig();

      config.getInitialised = null;

      setup(getInitialTestStoreState(), config, (component) => {
        const componentDeTyped = (component as any);
        spyOn<any>(componentDeTyped, 'initialise');
        expect(componentDeTyped.initialise).not.toHaveBeenCalled();

        component.ngOnInit();

        component.initialised$.subscribe(res => {
          expect(componentDeTyped.initialise).toHaveBeenCalled();
          expect(res).toBe(true);

          done();
        });
      });
    });

    it('initialised - custom', (done) => {
      const config = createBasicListConfig();
      spyOn<any>(config, 'getInitialised').and.returnValue(observableOf(true));

      setup(getInitialTestStoreState(), config, (component) => {
        const componentDeTyped = (component as any);
        spyOn<any>(componentDeTyped, 'initialise');
        expect(componentDeTyped.initialise).not.toHaveBeenCalled();

        component.ngOnInit();
        expect(config.getInitialised).toHaveBeenCalled();

        component.initialised$.subscribe(res => {
          expect(componentDeTyped.initialise).toHaveBeenCalled();
          expect(res).toBe(true);
          done();
        });
      });
    });
  });

  describe('full test bed', () => {

    let component: ListComponent<EndpointModel>;
    let fixture: ComponentFixture<ListComponent<EndpointModel>>;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: ListConfig, useClass: EndpointsListConfigService },
          ApplicationStateService,
          PaginationMonitorFactory,
          EntityMonitorFactory
        ],
        imports: [
          CoreModule,
          SharedModule,
          createBasicStoreModule(),
          NoopAnimationsModule
        ],
      })
        .compileComponents();
      fixture = TestBed.createComponent<ListComponent<EndpointModel>>(ListComponent);
      component = fixture.componentInstance;
      component.columns = [];
    });

    it('should be created', async(() => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    }));


    describe('Header', () => {
      it('Nothing enabled', async(() => {
        component.config.getMultiFiltersConfigs = () => [];
        component.config.enableTextFilter = false;
        component.config.viewType = ListViewTypes.CARD_ONLY;
        component.config.defaultView = 'card' as ListView;
        component.config.cardComponent = CfEndpointCardComponent;
        component.config.text.title = null;
        const columns = component.config.getColumns();
        columns.forEach(column => column.sort = false);
        component.config.getColumns = () => columns;
        fixture.detectChanges();

        const hostElement = fixture.nativeElement;

        // No multi filters
        const multiFilterSection: HTMLElement = hostElement.querySelector('.list-component__header__left--multi-filters');
        expect(multiFilterSection.hidden).toBeFalsy();
        expect(multiFilterSection.childElementCount).toBe(0);

        const headerRightSection = hostElement.querySelector('.list-component__header__right');
        // No text filter
        const filterSection: HTMLElement = headerRightSection.querySelector('.filter');
        expect(filterSection.hidden).toBeTruthy();

        // No sort
        const sortSection: HTMLElement = headerRightSection.querySelector('.sort');
        expect(sortSection.hidden).toBeTruthy();

        component.initialised$.pipe(
          switchMap(() => component.hasControls$)
        ).subscribe(hasControls => {
          expect(hasControls).toBeFalsy();
        });

      }));

      it('Everything enabled', async(() => {
        component.config.getMultiFiltersConfigs = () => {
          return [
            {
              key: 'filterTestKey',
              label: 'filterTestLabel',
              list$: observableOf([
                {
                  label: 'filterItemLabel',
                  item: 'filterItemItem',
                  value: 'filterItemValue'
                }
              ]),
              loading$: observableOf(false),
              select: new BehaviorSubject(false)
            }
          ];
        };
        component.config.enableTextFilter = true;
        component.config.viewType = ListViewTypes.CARD_ONLY;
        component.config.defaultView = 'card' as ListView;
        component.config.cardComponent = CfEndpointCardComponent;
        component.config.getColumns = () => [
          {
            columnId: 'filterTestKey',
            headerCell: () => 'a',
            cellDefinition: {
              getValue: (row) => `${row}`
            },
            sort: true,
          }
        ];

        fixture.detectChanges();

        const hostElement = fixture.nativeElement;

        // multi filters
        const multiFilterSection: HTMLElement = hostElement.querySelector('.list-component__header__left--multi-filters');
        expect(multiFilterSection.hidden).toBeFalsy();
        expect(multiFilterSection.childElementCount).toBe(1);

        // text filter
        const headerRightSection = hostElement.querySelector('.list-component__header__right');
        const filterSection: HTMLElement = headerRightSection.querySelector('.filter');
        expect(filterSection.hidden).toBeFalsy();

        // sort - hard to test for sort, as it relies on
        // const sortSection: HTMLElement = headerRightSection.querySelector('.sort');
        // expect(sortSection.hidden).toBeFalsy();
      }));
    });


    it('No rows', async(() => {
      fixture.detectChanges();

      const hostElement = fixture.nativeElement;

      // No paginator
      const sortSection: HTMLElement = hostElement.querySelector('.list-component__paginator');
      expect(sortSection.hidden).toBeTruthy();

      // Shows empty message
      const noEntriesMessage: HTMLElement = hostElement.querySelector('.list-component__default-no-entries');
      expect(noEntriesMessage.hidden).toBeFalsy();
    }));

  });

});
