package main

import (
	"errors"
	"net/http"
	"testing"

	_ "github.com/satori/go.uuid"
	"gopkg.in/DATA-DOG/go-sqlmock.v1"
)

func TestRegisterHCFCluster(t *testing.T) {
	t.Parallel()

	mockV2Info := setupMockServer(t,
		msRoute("/v2/info"),
		msMethod("GET"),
		msStatus(http.StatusOK),
		msBody(jsonMust(mockV2InfoResponse)))

	defer mockV2Info.Close()

	req := setupMockReq("POST", "", map[string]string{
		"cnsi_name":           "Some fancy HCF Cluster",
		"api_endpoint":        mockV2Info.URL,
		"skip_ssl_validation": "true",
	})

	_, _, ctx, pp, db, mock := setupHTTPTest(req)
	defer db.Close()

	mock.ExpectExec(insertIntoCNSIs).
		WithArgs(sqlmock.AnyArg(), "Some fancy HCF Cluster", "hcf", mockV2Info.URL, mockAuthEndpoint, mockTokenEndpoint, mockDopplerEndpoint, true).
		WillReturnResult(sqlmock.NewResult(1, 1))

	if err := pp.registerHCFCluster(ctx); err != nil {
		t.Errorf("Failed to register cluster: %v", err)
	}

	if dberr := mock.ExpectationsWereMet(); dberr != nil {
		t.Errorf("There were unfulfilled expectations: %s", dberr)
	}
}

func TestRegisterHCFClusterWithMissingName(t *testing.T) {
	t.Parallel()

	mockV2Info := setupMockServer(t,
		msRoute("/v2/info"),
		msMethod("GET"),
		msStatus(http.StatusOK),
		msBody(jsonMust(mockV2InfoResponse)))

	defer mockV2Info.Close()

	req := setupMockReq("POST", "", map[string]string{
		"api_endpoint": mockV2Info.URL,
	})

	_, _, ctx, pp, db, _ := setupHTTPTest(req)
	defer db.Close()

	if err := pp.registerHCFCluster(ctx); err == nil {
		t.Error("Should not be able to register cluster without cluster name")
	}
}

func TestRegisterHCFClusterWithMissingAPIEndpoint(t *testing.T) {
	t.Parallel()

	mockV2Info := setupMockServer(t,
		msRoute("/v2/info"),
		msMethod("GET"),
		msStatus(http.StatusOK),
		msBody(jsonMust(mockV2InfoResponse)))

	defer mockV2Info.Close()

	req := setupMockReq("POST", "", map[string]string{
		"cnsi_name": "Some fancy HCF Cluster",
	})

	_, _, ctx, pp, db, _ := setupHTTPTest(req)
	defer db.Close()

	if err := pp.registerHCFCluster(ctx); err == nil {
		t.Error("Should not be able to register cluster without api endpoint")
	}
}

func TestRegisterHCFClusterWithInvalidAPIEndpoint(t *testing.T) {
	t.Parallel()

	mockV2Info := setupMockServer(t,
		msRoute("/v2/info"),
		msMethod("GET"),
		msStatus(http.StatusOK),
		msBody(jsonMust(mockV2InfoResponse)))

	defer mockV2Info.Close()

	// force a bad api_endpoint to be sure it is handled properly:
	// src: https://bryce.fisher-fleig.org/blog/golang-testing-stdlib-errors/index.html
	req := setupMockReq("POST", "", map[string]string{
		"cnsi_name":    "Some fancy HCF Cluster",
		"api_endpoint": "%zzzzz",
	})

	_, _, ctx, pp, db, _ := setupHTTPTest(req)
	defer db.Close()

	if err := pp.registerHCFCluster(ctx); err == nil {
		t.Error("Should not be able to register cluster without a valid api endpoint")
	}
}

func TestRegisterHCFClusterWithBadV2Request(t *testing.T) {
	t.Parallel()

	mockV2Info := setupMockServer(t,
		msRoute("/v2/info"),
		msMethod("GET"),
		msStatus(http.StatusNotFound),
		msBody(""))

	defer mockV2Info.Close()

	req := setupMockReq("POST", "", map[string]string{
		"cnsi_name":    "Some fancy HCF Cluster",
		"api_endpoint": mockV2Info.URL,
	})

	_, _, ctx, pp, db, _ := setupHTTPTest(req)
	defer db.Close()

	if err := pp.registerHCFCluster(ctx); err == nil {
		t.Error("Should not register cluster if call to v2/info fails")
	}
}

func TestRegisterHCFClusterButCantSaveCNSIRecord(t *testing.T) {
	t.Parallel()

	mockV2Info := setupMockServer(t,
		msRoute("/v2/info"),
		msMethod("GET"),
		msStatus(http.StatusOK),
		msBody(jsonMust(mockV2InfoResponse)))

	defer mockV2Info.Close()

	req := setupMockReq("POST", "", map[string]string{
		"cnsi_name":    "Some fancy HCF Cluster",
		"api_endpoint": mockV2Info.URL,
	})

	_, _, ctx, pp, db, mock := setupHTTPTest(req)
	defer db.Close()

	mock.ExpectExec(insertIntoCNSIs).
		WillReturnError(errors.New("Unknown Database Error"))

	if err := pp.registerHCFCluster(ctx); err == nil {
		t.Errorf("Unexpected success - should not be able to register cluster withot token save.")
	}
}

func TestRegisterHCECluster(t *testing.T) {
	t.Parallel()

	mockInfo := setupMockServer(t,
		msRoute("/info"),
		msMethod("GET"),
		msStatus(http.StatusOK),
		msBody(jsonMust(mockInfoResponse)))

	defer mockInfo.Close()

	req := setupMockReq("POST", "", map[string]string{
		"cnsi_name":           "Some fancy HCE Cluster",
		"api_endpoint":        mockInfo.URL,
		"skip_ssl_validation": "true",
	})

	_, _, ctx, pp, db, mock := setupHTTPTest(req)
	defer db.Close()

	mock.ExpectExec(insertIntoCNSIs).
		WithArgs(sqlmock.AnyArg(), "Some fancy HCE Cluster", "hce", mockInfo.URL, "", "", "", true).
		WillReturnResult(sqlmock.NewResult(1, 1))

	if err := pp.registerHCECluster(ctx); err != nil {
		t.Errorf("Failed to register cluster: %v", err)
	}

	if dberr := mock.ExpectationsWereMet(); dberr != nil {
		t.Errorf("There were unfulfilled expectations: %s", dberr)
	}
}

func TestRegisterHCEClusterWithMissingName(t *testing.T) {
	t.Parallel()

	mockInfo := setupMockServer(t,
		msRoute("/info"),
		msMethod("GET"),
		msStatus(http.StatusOK),
		msBody(jsonMust(mockInfoResponse)))

	defer mockInfo.Close()

	req := setupMockReq("POST", "", map[string]string{
		"api_endpoint": mockInfo.URL,
	})

	_, _, ctx, pp, db, _ := setupHTTPTest(req)
	defer db.Close()

	if err := pp.registerHCECluster(ctx); err == nil {
		t.Error("Should not be able to register cluster without cluster name")
	}
}

func TestRegisterHCEClusterWithMissingAPIEndpoint(t *testing.T) {
	t.Parallel()

	mockInfo := setupMockServer(t,
		msRoute("/info"),
		msMethod("GET"),
		msStatus(http.StatusOK),
		msBody(jsonMust(mockInfoResponse)))

	defer mockInfo.Close()

	req := setupMockReq("POST", "", map[string]string{
		"cnsi_name": "Some fancy HCE Cluster",
	})

	_, _, ctx, pp, db, _ := setupHTTPTest(req)
	defer db.Close()

	if err := pp.registerHCECluster(ctx); err == nil {
		t.Error("Should not be able to register cluster without api endpoint")
	}
}

func TestRegisterHCEClusterWithInvalidAPIEndpoint(t *testing.T) {
	t.Parallel()

	mockInfo := setupMockServer(t,
		msRoute("/info"),
		msMethod("GET"),
		msStatus(http.StatusOK),
		msBody(jsonMust(mockInfoResponse)))

	defer mockInfo.Close()

	// force a bad api_endpoint to be sure it is handled properly:
	// src: https://bryce.fisher-fleig.org/blog/golang-testing-stdlib-errors/index.html
	req := setupMockReq("POST", "", map[string]string{
		"cnsi_name":    "Some fancy HCE Cluster",
		"api_endpoint": "%zzzzz",
	})

	_, _, ctx, pp, db, _ := setupHTTPTest(req)
	defer db.Close()

	if err := pp.registerHCECluster(ctx); err == nil {
		t.Error("Should not be able to register cluster without a valid api endpoint")
	}
}

func TestRegisterHCEClusterWithBadV2Request(t *testing.T) {
	t.Skip("TODO: fix this!") // https://jira.hpcloud.net/browse/TEAMFOUR-637
	t.Parallel()

	mockInfo := setupMockServer(t,
		msRoute("/info"),
		msMethod("GET"),
		msStatus(http.StatusNotFound),
		msBody(""))

	defer mockInfo.Close()

	req := setupMockReq("POST", "", map[string]string{
		"cnsi_name":    "Some fancy HCE Cluster",
		"api_endpoint": mockInfo.URL,
	})

	_, _, ctx, pp, db, _ := setupHTTPTest(req)
	defer db.Close()

	if err := pp.registerHCECluster(ctx); err == nil {
		t.Error("Should not register cluster if call to info fails")
	}
}

func TestRegisterHCEClusterButCantSaveCNSIRecord(t *testing.T) {
	t.Parallel()

	mockInfo := setupMockServer(t,
		msRoute("/info"),
		msMethod("GET"),
		msStatus(http.StatusOK),
		msBody(jsonMust(mockInfoResponse)))

	defer mockInfo.Close()

	req := setupMockReq("POST", "", map[string]string{
		"cnsi_name":    "Some fancy HCE Cluster",
		"api_endpoint": mockInfo.URL,
	})

	_, _, ctx, pp, db, mock := setupHTTPTest(req)
	defer db.Close()

	mock.ExpectExec(insertIntoCNSIs).
		WillReturnError(errors.New("Unknown Database Error"))

	if err := pp.registerHCECluster(ctx); err == nil {
		t.Errorf("Unexpected success - should not be able to register cluster withot token save.")
	}
}

func TestListCNSIs(t *testing.T) {
	t.Skip("TODO: fix this test") // https://jira.hpcloud.net/browse/TEAMFOUR-637
	t.Parallel()

	req := setupMockReq("GET", "", nil)

	_, _, ctx, pp, db, mock := setupHTTPTest(req)
	defer db.Close()

	// Mock the CNSIs in the database
	expectedCNSIList := expectHCFAndHCERows()
	mock.ExpectQuery(selectAnyFromCNSIs).
		WillReturnRows(expectedCNSIList)

	err := pp.listCNSIs(ctx)
	if err != nil {
		t.Errorf("Unable to retriece list of registered CNSIs from /cnsis: %v", err)
	}

	if dberr := mock.ExpectationsWereMet(); dberr != nil {
		t.Errorf("There were unfulfilled expectations: %s", dberr)
	}
}

func TestListCNSIsWhenListFails(t *testing.T) {
	t.Parallel()

	req := setupMockReq("GET", "", nil)

	_, _, ctx, pp, db, mock := setupHTTPTest(req)
	defer db.Close()

	// Mock a database error
	mock.ExpectQuery(selectAnyFromCNSIs).
		WillReturnError(errors.New("Unknown Database Error"))

	err := pp.listCNSIs(ctx)

	if err == nil {
		t.Errorf("Should receive an error when unable to get a list of registered CNSIs from /cnsis: %v", err)
	}
}

func TestGetHCFv2InfoWithBadURL(t *testing.T) {
	t.Parallel()

	invalidEndpoint := "%zzzz"
	if _, err := getHCFv2Info(invalidEndpoint, true); err == nil {
		t.Error("getHCFv2Info should not return a valid response when the URL is bad.")
	}
}

func TestGetHCFv2InfoWithInvalidEndpoint(t *testing.T) {
	t.Parallel()

	ep := "http://invalid.net"
	if _, err := getHCFv2Info(ep, true); err == nil {
		t.Error("getHCFv2Info should not return a valid response when the endpoint is invalid.")
	}
}

func TestGetHCEInfoWithBadURL(t *testing.T) {
	t.Parallel()

	invalidEndpoint := "%zzzz"
	if _, err := getHCEInfo(invalidEndpoint, true); err == nil {
		t.Error("getHCEInfo should not return a valid response when the URL is bad.")
	}
}

func TestGetHCEInfoWithInvalidEndpoint(t *testing.T) {
	t.Parallel()

	ep := "http://invalid.net"
	if _, err := getHCEInfo(ep, true); err == nil {
		t.Error("getHCEInfo should not return a valid response when the endpoint is invalid.")
	}
}
