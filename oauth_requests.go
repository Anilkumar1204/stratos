package main

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/hpcloud/portal-proxy/repository/cnsis"
	"github.com/hpcloud/portal-proxy/repository/tokens"
)

func (p *portalProxy) doOauthFlowRequest(cnsiRequest CNSIRequest, req *http.Request) (*http.Response, error) {
	logger.Debug("doOauthFlowRequest")

	// get a cnsi token record and a cnsi record
	tokenRec, cnsi, err := p.getCNSIRequestRecords(cnsiRequest)
	if err != nil {
		return nil, fmt.Errorf("Unable to retrieve CNSI records: %v", err)
	}

	got401 := false
	expTime := time.Unix(tokenRec.TokenExpiry, 0)
	for {
		clientID := p.Config.HCFClient

		if cnsi.CNSIType == cnsis.CNSIHCE {
			clientID = p.Config.HCEClient
		}

		if got401 || expTime.Before(time.Now()) {
			refreshedTokenRec, err := p.refreshToken(cnsi.SkipSSLValidation, cnsiRequest.GUID, cnsiRequest.UserGUID, clientID, "", cnsi.TokenEndpoint)
			if err != nil {
				return nil, fmt.Errorf("Couldn't refresh token for CNSI with GUID %s", cnsiRequest.GUID)
			}
			tokenRec = refreshedTokenRec
		}
		req.Header.Set("Authorization", "bearer "+tokenRec.AuthToken)

		var client http.Client
		if cnsi.SkipSSLValidation {
			client = httpClientSkipSSL
		} else {
			client = httpClient
		}
		res, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("Request failed: %v", err)
		}

		if res.StatusCode != 401 {
			return res, nil
		}

		if got401 {
			return res, errors.New("Failed to authorize")
		}
		got401 = true
	}
}

func (p *portalProxy) getCNSIRequestRecords(r CNSIRequest) (t tokens.TokenRecord, c cnsis.CNSIRecord, err error) {
	logger.Debug("getCNSIRequestRecords")
	// look up token
	t, ok := p.getCNSITokenRecord(r.GUID, r.UserGUID)
	if !ok {
		return t, c, fmt.Errorf("Could not find token for csni:user %s:%s", r.GUID, r.UserGUID)
	}

	c, err = p.getCNSIRecord(r.GUID)
	if err != nil {
		return t, c, fmt.Errorf("Info could not be found for CNSI with GUID %s: %s", r.GUID, err)
	}

	return t, c, nil
}

func (p *portalProxy) refreshToken(skipSSLValidation bool, cnsiGUID, userGUID, client, clientSecret, tokenEndpoint string) (t tokens.TokenRecord, err error) {
	logger.Debug("refreshToken")
	tokenEndpointWithPath := fmt.Sprintf("%s/oauth/token", tokenEndpoint)

	// TODO (wchrisjohnson): this call is unnecessary. The cnsi token record was retrieved
	// a few lines above where this method was called. We should remove this and pass the
	// token in.
	userToken, ok := p.getCNSITokenRecord(cnsiGUID, userGUID)
	if !ok {
		return t, fmt.Errorf("Info could not be found for user with GUID %s", userGUID)
	}

	uaaRes, err := p.getUAATokenWithRefreshToken(skipSSLValidation, userToken.RefreshToken, client, clientSecret, tokenEndpointWithPath)
	if err != nil {
		return t, fmt.Errorf("Token refresh request failed: %v", err)
	}

	u, err := getUserTokenInfo(uaaRes.AccessToken)
	if err != nil {
		return t, fmt.Errorf("Could not get user token info from access token")
	}

	u.UserGUID = userGUID

	t, err = p.saveCNSIToken(cnsiGUID, *u, uaaRes.AccessToken, uaaRes.RefreshToken)
	if err != nil {
		return t, fmt.Errorf("Couldn't save new token: %v", err)
	}

	return t, nil
}
