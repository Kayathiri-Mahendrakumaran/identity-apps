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

import { AlertLevels } from "@wso2is/core/models";
import { addAlert } from "@wso2is/core/store";
import { useTrigger } from "@wso2is/forms";
import { Heading, LinkButton, PrimaryButton, Steps } from "@wso2is/react-components";
import _ from "lodash";
import React, { FunctionComponent, ReactElement, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Grid, Icon, Modal } from "semantic-ui-react";
import { AuthenticatorSettings, WizardSummary } from "./steps";
import { AuthenticatorTemplateSelection } from "./steps/authenticator-create-steps/authenticator-template-selection";
import {
    getFederatedAuthenticatorMetadata,
    updateFederatedAuthenticator
} from "../../../api";
import { IdentityProviderWizardStepIcons } from "../../../configs";
import {
    FederatedAuthenticatorMetaDataInterface,
    FederatedAuthenticatorMetaInterface,
    IdentityProviderInterface,
    IdentityProviderTemplateListItemInterface
} from "../../../models";

/**
 * Proptypes for the identity provider creation wizard component.
 */
interface AddAuthenticatorWizardPropsInterface {
    currentStep?: number;
    title: string;
    closeWizard: () => void;
    subTitle?: string;
    manualModeOptions: FederatedAuthenticatorMetaDataInterface[];
    availableTemplates?: IdentityProviderTemplateListItemInterface[];
    idpId?: string;
}

/**
 * Enum for wizard.
 *
 * @readonly
 * @enum {string}
 */
enum WizardConstants {
    AUTHENTICATOR = "authenticator"
}

/**
 * Constants for wizard steps.
 */
enum WizardSteps {
    TEMPLATE_SELECTION = "TemplateSelection",
    AUTHENTICATOR_SETTINGS = "AuthenticatorSettings",
    SUMMARY = "Summary"
}

/**
 * Interface for the wizard state.
 */
interface WizardStateInterface {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

/**
 * Interface for the wizard steps.
 */
interface WizardStepInterface {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any;
    title: string;
    submitCallback: any;
    name: WizardSteps;
}

/**
 * Identity provider creation wizard component.
 *
 * @param {AddAuthenticatorWizardPropsInterface} props - Props injected to the component.
 * @return {React.ReactElement}
 */
export const AuthenticatorCreateWizard: FunctionComponent<AddAuthenticatorWizardPropsInterface> = (
    props: AddAuthenticatorWizardPropsInterface
): ReactElement => {

    const {
        closeWizard,
        currentStep,
        title,
        subTitle,
        manualModeOptions,
        availableTemplates,
        idpId
    } = props;

    const [ initWizard, setInitWizard ] = useState<boolean>(true);
    const [ wizardSteps, setWizardSteps ] = useState<WizardStepInterface[]>(undefined);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [ isSelectionHidden, setIsSelectionHidden ] = useState<boolean>(false);
    const [ wizardState, setWizardState ] = useState<WizardStateInterface>(undefined);
    const [ partiallyCompletedStep, setPartiallyCompletedStep ] = useState<number>(undefined);
    const [ currentWizardStep, setCurrentWizardStep ] = useState<number>(currentStep);
    const [ selectedAuthenticatorMetadata, setSelectedAuthenticatorMetadata ] =
        useState<FederatedAuthenticatorMetaInterface>(undefined);
    const [ selectedTemplateId, setSelectedTemplateId ] = useState<string>(undefined);
    const [ selectedManualModeOptionId, setSelectedManualModeOptionId ] = useState<string>(undefined);

    const dispatch = useDispatch();

    // Triggers for each wizard step.
    const [ submitTemplateSelection, setSubmitTemplateSelection ] = useTrigger();
    const [ submitAuthenticator, setSubmitAuthenticator ] = useTrigger();
    const [ finishSubmit, setFinishSubmit ] = useTrigger();

    /**
     * Navigates to the next wizard step.
     */
    const navigateToNext = (): void => {
        let step = currentWizardStep;

        if (isSelectionHidden) {
            step = currentWizardStep + 1;
        }

        switch (wizardSteps[step]?.name) {
            case WizardSteps.TEMPLATE_SELECTION:
                setSubmitTemplateSelection();
                break;
            case WizardSteps.AUTHENTICATOR_SETTINGS:
                setSubmitAuthenticator();
                break;
            case WizardSteps.SUMMARY:
                setFinishSubmit();
                break;
            default:
                break;
        }
    };

    /**
     * Navigates to the previous wizard step.
     */
    const navigateToPrevious = (): void => {
        if (wizardSteps[currentWizardStep]?.name === WizardSteps.AUTHENTICATOR_SETTINGS) {
            setSelectedAuthenticatorMetadata(undefined);
            setSelectedTemplateId(undefined);
            setSelectedManualModeOptionId(undefined)
        }
        setPartiallyCompletedStep(currentWizardStep);
    };

    /**
     * Handles wizard step submit.
     *
     * @param values - Forms values to be stored in state.
     * @param {WizardConstants} formType - Type of the form.
     */
    const handleWizardFormSubmit = (values: any, formType: WizardConstants): void => {
		if (values.templateId) {
            setSelectedTemplateId(values.templateId);
        } else if (values.manualModeOptionId) {
            setSelectedManualModeOptionId(values.manualModeOptionId);
        } else {
            setWizardState(_.merge(wizardState, { [formType]: values }));
        }
        setCurrentWizardStep(currentWizardStep + 1);
    };

    /**
     * Generates a summary of the wizard.
     */
    const generateWizardSummary = (): IdentityProviderInterface => {
        if (!wizardState) {
            return;
        }
        return wizardState[WizardConstants.AUTHENTICATOR];
    };

    /**
     * Handles the final wizard submission.
     *
     * @param identityProvider - Identity provider data.
     */
    const handleWizardFormFinish = (identityProvider: IdentityProviderInterface): void => {
        const authenticator = identityProvider?.federatedAuthenticators?.authenticators.find((a) =>
            a.authenticatorId === identityProvider?.federatedAuthenticators?.defaultAuthenticatorId);
        authenticator.isDefault = false;
        addNewAuthenticator(authenticator);
    };

    const addNewAuthenticator = (authenticator) => {
        updateFederatedAuthenticator(idpId, authenticator)
            .then(() => {
                dispatch(addAlert({
                    description: "Successfully added the authenticator.",
                    level: AlertLevels.SUCCESS,
                    message: "Operation successful"
                }));
            })
            .catch((error) => {
                if (error.response && error.response.data && error.response.data.description) {
                    dispatch(addAlert({
                        description: error.response.data.description,
                        level: AlertLevels.ERROR,
                        message: "Operation error"
                    }));
                    return;
                }
                dispatch(addAlert({
                    description: "An error occurred while adding the authenticator.",
                    level: AlertLevels.ERROR,
                    message: "Operation error"
                }));
            })
            .finally(() => {
                closeWizard();
            });
    };

    /**
     * Called when modal close event is triggered.
     */
    const handleWizardClose = (): void => {

        // Clear data.
        setSelectedAuthenticatorMetadata(undefined);

        // Trigger the close method from props.
        closeWizard();
    };

    /**
     * Resolves the step content.
     *
     * @return {React.ReactElement} Step content.
     */
    const resolveStepContent = (currentStep: number): ReactElement => {
        let step = currentStep;

        if (isSelectionHidden) {
            step = currentStep + 1;
        }

        switch (wizardSteps[step]?.name) {
            case WizardSteps.TEMPLATE_SELECTION: {
                return (
                    <AuthenticatorTemplateSelection
                        triggerSubmit={ submitTemplateSelection }
                        onSubmit={ (values): void => handleWizardFormSubmit(values,
                            WizardConstants.AUTHENTICATOR) }
                        manualModeOptions={ manualModeOptions }
                        authenticatorTemplates={ availableTemplates }
                    />
                );
            }
            case WizardSteps.AUTHENTICATOR_SETTINGS: {
                return (
                    <AuthenticatorSettings
                        metadata={ selectedAuthenticatorMetadata }
                        initialValues={ wizardState[WizardConstants.AUTHENTICATOR] }
                        onSubmit={ (values): void => handleWizardFormSubmit(
                            values, WizardConstants.AUTHENTICATOR) }
                        triggerSubmit={ submitAuthenticator }
                    />
                )
            }
            case WizardSteps.SUMMARY: {
                return (
                    <WizardSummary
                        provisioningConnectorMetadata={ {} }
                        authenticatorMetadata={ selectedAuthenticatorMetadata }
                        triggerSubmit={ finishSubmit }
                        identityProvider={ generateWizardSummary() }
                        onSubmit={ handleWizardFormFinish }
                        isAddAuthenticatorWizard={ true }
                    />
                )
            }
        }
    };

    function loadAuthenticatorMetadata(authenticatorId: string) {
        getFederatedAuthenticatorMetadata(authenticatorId)
            .then((response) => {
                setSelectedAuthenticatorMetadata(response);
            })
            .catch((error) => {
                if (error.response && error.response.data && error.response.data.description) {
                    dispatch(addAlert({
                        description: error.response.data.description,
                        level: AlertLevels.ERROR,
                        message: "Retrieval error"
                    }));
                    return;
                }
                dispatch(addAlert({
                    description: "An error occurred retrieving the authenticator: ." + authenticatorId,
                    level: AlertLevels.ERROR,
                    message: "Retrieval error"
                }));
            });
    }

    useEffect(() => {
        if (selectedTemplateId) {
            const selectedTemplate = availableTemplates.find((template) => {
                return template.id === selectedTemplateId;
            });
            loadAuthenticatorMetadata(selectedTemplate.idp.federatedAuthenticators.defaultAuthenticatorId);
            setWizardState({
                ...wizardState,
                [WizardConstants.AUTHENTICATOR]: selectedTemplate.idp
            });
        }
    }, [selectedTemplateId]);

    useEffect(() => {
        if (selectedManualModeOptionId) {
            loadAuthenticatorMetadata(selectedManualModeOptionId);
            setWizardState({
                ...wizardState,
                [WizardConstants.AUTHENTICATOR]: {}
            });
        }
    }, [selectedManualModeOptionId]);

    /**
     * Called when required backend data are gathered.
     */
    useEffect(() => {
        if (!initWizard) {
            return;
        }

        setWizardState(_.merge(wizardState, {
            [WizardConstants.AUTHENTICATOR]: {}
        }));
        setWizardSteps([
            {
                icon: IdentityProviderWizardStepIcons.general,
                name: WizardSteps.TEMPLATE_SELECTION,
                submitCallback: setSubmitTemplateSelection,
                title: "Authenticator Selection"
            },
            {
                icon: IdentityProviderWizardStepIcons.authenticatorSettings,
                name: WizardSteps.AUTHENTICATOR_SETTINGS,
                submitCallback: setSubmitAuthenticator,
                title: "Authenticator Configuration"
            },
            {
                icon: IdentityProviderWizardStepIcons.summary,
                name: WizardSteps.SUMMARY,
                submitCallback: setFinishSubmit,
                title: "Summary"
            }
        ]);

        setInitWizard(false);
    }, [idpId]);

    /**
     * Sets the current wizard step to the previous on every `partiallyCompletedStep`
     * value change , and resets the partially completed step value.
     */
    useEffect(() => {
        if (partiallyCompletedStep === undefined) {
            return;
        }
        setCurrentWizardStep(currentWizardStep - 1);
        setPartiallyCompletedStep(undefined);
    }, [partiallyCompletedStep]);

    return (
        (
            wizardSteps ? <Modal
                open={ true }
                className="wizard identity-provider-create-wizard"
                dimmer="blurring"
                onClose={ handleWizardClose }
                closeOnDimmerClick
                closeOnEscape
            >
                <Modal.Header className="wizard-header">
                    {title}
                    {subTitle && <Heading as="h6">{subTitle}</Heading>}
                </Modal.Header>
                <Modal.Content className="steps-container">
                    <Steps.Group header={ "Fill the basic information about your authenticator." }
                                 current={ currentWizardStep }>
                        {wizardSteps.map((step, index) => (
                            <Steps.Step
                                key={ index }
                                icon={ step.icon }
                                title={ step.title }
                            />
                        ))}
                    </Steps.Group>
                </Modal.Content>
                <Modal.Content className="content-container" scrolling>{ resolveStepContent(currentWizardStep) }
                </Modal.Content>
                <Modal.Actions>
                    <Grid>
                        <Grid.Row column={ 1 }>
                            <Grid.Column mobile={ 8 } tablet={ 8 } computer={ 8 }>
                                <LinkButton floated="left" onClick={ handleWizardClose }>Cancel</LinkButton>
                            </Grid.Column>
                            <Grid.Column mobile={ 8 } tablet={ 8 } computer={ 8 }>
                                {currentWizardStep < wizardSteps.length - 1 && (
                                    <PrimaryButton floated="right" onClick={ navigateToNext }>
                                        Next<Icon name="arrow right"/>
                                    </PrimaryButton>
                                )}
                                {currentWizardStep === wizardSteps.length - 1 && (
                                    <PrimaryButton floated="right" onClick={ navigateToNext }>Finish</PrimaryButton>
                                )}
                                {currentWizardStep > 0 && (
                                    <LinkButton floated="right" onClick={ navigateToPrevious }>
                                        <Icon name="arrow left"/> Previous
                                    </LinkButton>
                                )}
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                </Modal.Actions>
            </Modal> : null
        )
    );
};

/**
 * Default props for the identity provider creation wizard.
 */
AuthenticatorCreateWizard.defaultProps = {
    currentStep: 0
};
