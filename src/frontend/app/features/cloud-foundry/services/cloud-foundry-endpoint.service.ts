import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { map, shareReplay } from 'rxjs/operators';

import { EntityService } from '../../../core/entity-service';
import { EntityServiceFactory } from '../../../core/entity-service-factory.service';
import { CfOrgSpaceDataService } from '../../../shared/data-services/cf-org-space-service.service';
import { CfUserService } from '../../../shared/data-services/cf-user.service';
import { PaginationMonitorFactory } from '../../../shared/monitors/pagination-monitor.factory';
import { CF_INFO_ENTITY_KEY, CFInfoSchema, GetEndpointInfo } from '../../../store/actions/cloud-foundry.actions';
import { EndpointSchema, GetAllEndpoints } from '../../../store/actions/endpoint.actions';
import { AppState } from '../../../store/app-state';
import { APIResource, EntityInfo } from '../../../store/types/api.types';
import { CfApplication, CfApplicationState } from '../../../store/types/application.types';
import { EndpointModel, EndpointUser } from '../../../store/types/endpoint.types';
import { CfOrg, CfSpace } from '../../../store/types/org-and-space.types';
import { CfUser } from '../../../store/types/user.types';
import { BaseCF } from '../cf-page.types';

@Injectable()
export class CloudFoundryEndpointService {
  allApps$: Observable<APIResource<CfApplication>[]>;
  users$: Observable<APIResource<CfUser>[]>;
  orgs$: Observable<APIResource<CfOrg>[]>;
  info$: Observable<EntityInfo<any>>;
  cfInfoEntityService: EntityService<any>;
  endpoint$: Observable<EntityInfo<EndpointModel>>;
  cfEndpointEntityService: EntityService<EndpointModel>;
  connected$: Observable<boolean>;
  currentUser$: Observable<EndpointUser>;
  CF_GUID: string;

  constructor(
    public baseCf: BaseCF,
    private store: Store<AppState>,
    private entityServiceFactory: EntityServiceFactory,
    private cfOrgSpaceDataService: CfOrgSpaceDataService,
    private cfUserService: CfUserService,
    private paginationMonitorFactory: PaginationMonitorFactory
  ) {
    this.CF_GUID = baseCf.guid;
    this.cfEndpointEntityService = this.entityServiceFactory.create(
      EndpointSchema.key,
      EndpointSchema,
      this.CF_GUID,
      new GetAllEndpoints()
    );

    this.cfInfoEntityService = this.entityServiceFactory.create(
      CF_INFO_ENTITY_KEY,
      CFInfoSchema,
      this.CF_GUID,
      new GetEndpointInfo(this.CF_GUID)
    );
    this.constructCoreObservables();
  }

  constructCoreObservables() {
    this.endpoint$ = this.cfEndpointEntityService.waitForEntity$;

    this.connected$ = this.endpoint$.pipe(
      map(p => p.entity.connectionStatus === 'connected')
    );

    this.orgs$ = this.cfOrgSpaceDataService.getEndpointOrgs(this.CF_GUID);

    this.users$ = this.cfUserService.getUsers(this.CF_GUID);

    this.currentUser$ = this.endpoint$.pipe(map(e => e.entity.user));

    this.info$ = this.cfInfoEntityService.waitForEntity$.pipe(shareReplay(1));

    this.allApps$ = this.orgs$.pipe(
      // This should go away once https://github.com/cloudfoundry-incubator/stratos/issues/1619 is fixed
      map(orgs => orgs.filter(org => org.entity.spaces)),
      map(p => {
        return p.map(o => o.entity.spaces.map(space => space.entity.apps));
      }),
      map(a => {
        let flatArray = [];
        a.forEach(
          appsInSpace => (flatArray = flatArray.concat(...appsInSpace))
        );
        return flatArray;
      })
    );
  }

  getAppsInOrg(
    org: APIResource<CfOrg>
  ): Observable<APIResource<CfApplication>[]> {
    // This should go away once https://github.com/cloudfoundry-incubator/stratos/issues/1619 is fixed
    if (!org.entity.spaces) {
      return Observable.of([]);
    }
    return this.allApps$.pipe(
      map(apps => {
        const orgSpaces = org.entity.spaces.map(s => s.metadata.guid);
        return apps.filter(a => orgSpaces.indexOf(a.entity.space_guid) !== -1);
      })
    );
  }

  getAppsInSpace(
    space: APIResource<CfSpace>
  ): Observable<APIResource<CfApplication>[]> {
    return this.allApps$.pipe(
      map(apps => {
        return apps.filter(a => a.entity.space_guid === space.entity.guid);
      })
    );
  }

  getAggregateStat(
    org: APIResource<CfOrg>,
    statMetric: string
  ): Observable<number> {
    return this.getAppsInOrg(org).pipe(
      map(apps => this.getMetricFromApps(apps, statMetric))
    );
  }

  public getMetricFromApps(
    apps: APIResource<CfApplication>[],
    statMetric: string
  ): any {
    return apps ? apps
      .filter(a => a.entity.state !== CfApplicationState.STOPPED)
      .map(a => a.entity[statMetric] * a.entity.instances)
      .reduce((a, t) => a + t, 0) : 0;
  }
}