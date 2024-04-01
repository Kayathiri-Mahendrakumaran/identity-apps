/**
 * Copyright (c) 2023, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { HttpMethods } from "@wso2is/core/models";
import useRequest, {
    RequestConfigInterface,
    RequestResultInterface
} from "../../../../admin.core.v1/hooks/use-request";
import { store } from "../../../../admin.core.v1/store";
import { InterfaceLogsRequest, InterfaceLogsResponse } from "../models/log-models";

/**
 * Hook to get logs.
 * @param data - logs search API endpoint POST request payload
 * @returns Logs responses.
 */
export const useLogs = <Data = InterfaceLogsResponse, Error = unknown>(
    data: InterfaceLogsRequest
): RequestResultInterface<Data, Error> => {
    const requestConfig: RequestConfigInterface = {
        data: data,
        headers: {
            "Content-Type": "application/json"
        },
        method: HttpMethods.POST,
        url: (data?.logType === 0)
            ? store.getState().config.endpoints.diagnosticLogsEndpoint
            : store.getState().config.endpoints.auditLogsEndpoint
    };

    return useRequest<Data, Error>(data ? requestConfig : null);
};
