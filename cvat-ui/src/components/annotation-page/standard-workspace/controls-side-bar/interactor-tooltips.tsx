// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import Image from 'antd/lib/image';
import Paragraph from 'antd/lib/typography/Paragraph';
import Text from 'antd/lib/typography/Text';

interface Props {
    name?: string;
    gif?: string;
    message?: string;
    withNegativePoints?: boolean;
}

function InteractorTooltips(props: Props): JSX.Element {
    const { t } = useTranslation();
    const {
        name, gif, message, withNegativePoints,
    } = props;
    const UNKNOWN_MESSAGE = t('Selected interactor does not have a help message');
    const desc = message || UNKNOWN_MESSAGE;
    return (
        <div className='cvat-interactor-tip-container'>
            {name ? (
                <>
                    <Paragraph>{desc}</Paragraph>
                    <Paragraph>
                        <Trans i18nKey="preventSsrHelpText">
                            You can prevent server requests holding
                            <Text strong> Ctrl </Text>
                            key
                        </Trans>
                    </Paragraph>
                    <Paragraph>
                        <Text>{t('Positive points can be added by left-clicking the image. ')}</Text>
                        {withNegativePoints ? (
                            <Text>{t('Negative points can be added by right-clicking the image. ')}</Text>
                        ) : null}
                    </Paragraph>
                    {gif ? <Image className='cvat-interactor-tip-image' alt='Example gif' src={gif} /> : null}
                </>
            ) : (
                <Text>{t('Select an interactor to see help message')}</Text>
            )}
        </div>
    );
}

export default React.memo(InteractorTooltips);
