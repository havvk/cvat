// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import i18n from 'i18next';
import { connect } from 'react-redux';
import Result from 'antd/lib/result';
import Text from 'antd/lib/typography/Text';
import Paragraph from 'antd/lib/typography/Paragraph';
import Collapse from 'antd/lib/collapse';
import TextArea from 'antd/lib/input/TextArea';

import { ThunkDispatch } from 'utils/redux';
import { resetAfterErrorAsync } from 'actions/boundaries-actions';
import { CombinedState } from 'reducers';
import { logError } from 'cvat-logger';
import config from 'config';

interface OwnProps {
    children: JSX.Element;
}

interface StateToProps {
    job: any | null;
    serverVersion: string;
    uiVersion: string;
}

interface DispatchToProps {
    restore(): void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            job: { instance: job },
        },
        about: { server, packageVersion },
    } = state;

    return {
        job,
        serverVersion: server.version as string,
        uiVersion: packageVersion.ui,
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch): DispatchToProps {
    return {
        restore(): void {
            dispatch(resetAfterErrorAsync());
        },
    };
}

type Props = StateToProps & DispatchToProps & OwnProps;
class GlobalErrorBoundary extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
        };
    }

    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        logError(error, true, {
            type: 'component',
            componentStack: errorInfo.componentStack,
        });
    }

    public render(): React.ReactNode {
        const {
            restore, job, serverVersion, uiVersion,
        } = this.props;

        const { hasError, error } = this.state;

        const restoreGlobalState = (): void => {
            this.setState({
                error: null,
                hasError: false,
            });

            restore();
        };

        if (hasError && error) {
            const message = `${error.name}\n${error.message}\n\n${error.stack}`;
            return (
                <div className='cvat-global-boundary'>
                    <Result
                        status='error'
                        title={i18n.t('unexpectedErrorTitle')}
                        subTitle={i18n.t('unexpectedErrorSubtitle')}
                    >
                        <div>
                            <Paragraph>
                                <Paragraph strong>{i18n.t('whatHappened')}</Paragraph>
                                <Paragraph>{i18n.t('programErrorOccurred')}</Paragraph>
                                <Collapse
                                    accordion
                                    defaultActiveKey={['errorMessage']}
                                    items={[{
                                        key: 'errorMessage',
                                        label: i18n.t('exceptionDetails'),
                                        children: (
                                            <Text type='danger'>
                                                <TextArea
                                                    className='cvat-global-boundary-error-field'
                                                    autoSize
                                                    value={message}
                                                />
                                            </Text>
                                        ),
                                    }]}
                                />
                            </Paragraph>

                            <Paragraph>
                                <Text strong>{i18n.t('whatShouldIDo')}</Text>
                            </Paragraph>
                            <ul>
                                <li>
                                    {i18n.t('notifyAdminOrSubmitIssue')}
                                    <a href={config.GITHUB_URL}> GitHub. </a>
                                    {i18n.t('provideFollowingDetails')}
                                    <ul>
                                        <li>{i18n.t('fullErrorMessageAbove')}</li>
                                        <li>{i18n.t('stepsToReproduce')}</li>
                                        <li>{i18n.t('osAndBrowserVersion')}</li>
                                        <li>{i18n.t('cvatVersion')}</li>
                                        <ul>
                                            <li>
                                                <Text strong>
                                                    {i18n.t('server')}
:
                                                    {' '}
                                                </Text>
                                                {serverVersion}
                                            </li>
                                            <li>
                                                <Text strong>
                                                    {i18n.t('ui')}
:
                                                    {' '}
                                                </Text>
                                                {uiVersion}
                                            </li>
                                        </ul>
                                    </ul>
                                </li>
                                {job ? (
                                    <li>
                                        {i18n.t('press')}
                                        {/* eslint-disable-next-line */}
                                        <a onClick={restoreGlobalState}> {i18n.t('here')} </a>
                                        {i18n.t('restoreAnnotationProgressOr')}
                                        {/* eslint-disable-next-line */}
                                        <a onClick={() => window.location.reload()}> {i18n.t('update')} </a>
                                        {i18n.t('thePage')}
                                    </li>
                                ) : (
                                    <li>
                                        {/* eslint-disable-next-line */}
                                        <a onClick={() => window.location.reload()}>{i18n.t('update')} </a>
                                        {i18n.t('thePage')}
                                    </li>
                                )}
                            </ul>
                        </div>
                    </Result>
                </div>
            );
        }

        const { children } = this.props;
        return children;
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(GlobalErrorBoundary);
