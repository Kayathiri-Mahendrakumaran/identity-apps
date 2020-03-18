/**
 * Copyright (c) 2020, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
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

import React, { FunctionComponent, ReactElement, useState } from "react";
import { AuthenticationFlow } from "./authentication-flow";
import {
    AdaptiveAuthTemplateInterface,
    AuthenticationSequenceInterface,
    AuthenticationStepInterface
} from "../../../models";
import { AdaptiveScripts } from "./adaptive-scripts";
import { Divider } from "semantic-ui-react";

/**
 * Proptypes for the sign on methods component.
 */
interface SignOnMethodsPropsInterface {
    /**
     * ID of the application.
     */
    appId?: string;
    /**
     * Currently configured authentication sequence for the application.
     */
    authenticationSequence: AuthenticationSequenceInterface;
    /**
     * Is the application info request loading.
     */
    isLoading?: boolean;
    /**
     * Callback to update the application details.
     */
    onUpdate: (id: string) => void;
}

/**
 * Configure the different sign on strategies for an application.
 *
 * @param {SignOnMethodsPropsInterface} props - Props injected to the component.
 * @return {ReactElement}
 */
export const SignOnMethods: FunctionComponent<SignOnMethodsPropsInterface> = (
    props: SignOnMethodsPropsInterface
): ReactElement => {

    const {
        appId,
        authenticationSequence,
        isLoading,
        onUpdate
    } = props;

    const [ sequence, setSequence ] = useState<AuthenticationSequenceInterface>(authenticationSequence);

    /**
     * Handles the data loading from a adaptive auth template when it is selected
     * from the panel.
     *
     * @param {AdaptiveAuthTemplateInterface} template - Adaptive authentication templates.
     */
    const handleLoadingDataFromTemplate = (template: AdaptiveAuthTemplateInterface) => {
        if (!template) {
            return;
        }

        let newSequence = { ...sequence };

        if (template.code) {
            newSequence = {
                ...newSequence,
                script: JSON.stringify(template.code)
            }
        }

        if (template.defaultAuthenticators) {
            const steps: AuthenticationStepInterface[] = [];

            for (const [ key, value ] of Object.entries(template.defaultAuthenticators)) {
                steps.push({
                    id: parseInt(key, 10),
                    options: value.local.map((authenticator) => {
                        return {
                            idp: "LOCAL",
                            authenticator
                        }
                    })
                })
            }

            newSequence = {
                ...newSequence,
                subjectStepId: 1,
                attributeStepId: 1,
                steps
            }
        }

        setSequence(newSequence);
    };

    return (
        <div className="sign-on-methods-tab-content">
            <AuthenticationFlow
                appId={ appId }
                authenticationSequence={ sequence }
                isLoading={ isLoading }
                onUpdate={ onUpdate }
            />
            <Divider hidden />
            <AdaptiveScripts
                appId={ appId }
                authenticationSequence={ sequence }
                isLoading={ isLoading }
                onTemplateSelect={ handleLoadingDataFromTemplate }
                onUpdate={ onUpdate }
            />
        </div>
    );
};
