// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import i18n from 'i18next';
import { InfoCircleTwoTone, LoadingOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import { CanvasHint } from 'cvat-canvas-wrapper';

const FORCE_MESSAGE_FLAG = 'force';

function translateHintContent(content: string): string {
    const hintKeyByContent: Record<string, string> = {
        'Click a mask or polygon shape you would like to slice': 'clickMaskOrPolygonToSlice',
        'Click masks you would like to join together. To unselect click selected mask one more time':
            'clickMasksToJoin',
    };

    return hintKeyByContent[content] ? i18n.t(hintKeyByContent[content]) : content;
}

interface State {
    hints: CanvasHint[] | null;
    topic: string;
    hiddenHints: Record<string, boolean>;
}

export default class CanvasTipsComponent extends React.PureComponent<{}, State> {
    public constructor(props: {}) {
        super(props);
        let hiddenHints = {};
        try {
            hiddenHints = JSON.parse(localStorage.getItem('hiddenHints') || '{}');
        } catch (error: unknown) {
            // do nothing
        }

        this.state = {
            hints: null,
            topic: '',
            hiddenHints,
        };
    }

    public update(hints: CanvasHint[] | null, topic: string): void {
        this.setState({ hints, topic });
    }

    public render(): JSX.Element | null {
        const { hints, hiddenHints, topic } = this.state;

        if (hints && !hiddenHints[topic]) {
            const blocks = hints.map(({
                type, content, className, icon,
            }, idx) => {
                let Icon = null;
                if (icon === 'info') {
                    Icon = <InfoCircleTwoTone />;
                } else if (icon === 'loading') {
                    Icon = <LoadingOutlined />;
                }
                if (type === 'text') {
                    return (
                        <div key={idx} className={`cvat-canvas-hints-block ${className || ''}`}>
                            { Icon }
                            <Text>{translateHintContent(content as string)}</Text>
                        </div>
                    );
                }

                return (
                    <div key={idx} className={`cvat-canvas-hints-block ${className || ''}`}>
                        <ul>
                            {(content as string[]).map((line, secIdx) => (
                                <li key={secIdx}>{translateHintContent(line)}</li>
                            ))}
                        </ul>
                    </div>
                );
            });

            return (
                <div style={{ filter: 'none' }} className='cvat-canvas-hints-container'>
                    { blocks }
                    { topic !== FORCE_MESSAGE_FLAG && (
                        <Button
                            onClick={() => {
                                const updated = { ...hiddenHints, [topic]: true };
                                localStorage.setItem('hiddenHints', JSON.stringify(updated));
                                this.setState({ hiddenHints: updated });
                            }}
                            className='cvat-canvas-hints-hide-button'
                            type='link'
                        >
                            {i18n.t('hide')}
                        </Button>
                    )}
                </div>
            );
        }

        return (
            <div className='cvat-canvas-hints-container cvat-canvas-hints-container-disabled' />
        );
    }
}
