
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { Row, Col, Form, Input, Button, notification } from 'antd';
import Text from 'antd/lib/typography/Text';
import Spin from 'antd/lib/spin';

import { getCore } from 'cvat-core-wrapper';

const core = getCore();

async function getCSRFToken(): Promise<string> {
    const response = await fetch('/api/server/about');
    return response.headers.get('X-CSRFToken') || '';
}

export default function InvitationConfirmPage(): JSX.Element {
    const [form] = Form.useForm();
    const history = useHistory();
    const [email, setEmail] = useState<string | null>(null);
    const [key, setKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(history.location.search);
        const invitationKey = params.get('key');
        if (!invitationKey) {
            setError('Invitation key not found in URL.');
            setLoading(false);
            return;
        }

        setKey(invitationKey);

        fetch(`/api/auth/invitation/confirm/${invitationKey}`)
            .then(async (response) => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Failed to verify invitation');
            })
            .then((data) => {
                setEmail(data.email);
                form.setFieldsValue({ email: data.email });
            })
            .catch(() => {
                setError('This invitation is invalid, expired, or has already been accepted.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [history, form]);

    const onFinish = async (values: any) => {
        if (key) {
            try {
                setLoading(true);
                const csrfToken = await getCSRFToken();
                const response = await fetch(`/api/auth/invitation/confirm/${key}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': csrfToken,
                        },
                        body: JSON.stringify({
                            username: values.username,
                            new_password1: values.password,
                            new_password2: values.confirm,
                        }),
                    });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(JSON.stringify(data));
                }

                notification.success({
                    message: 'Account created successfully',
                    description: 'You can now log in with your new credentials.',
                });
                history.push('/auth/login');
            } catch (err: any) {
                let message = 'Could not create account.';
                try {
                    const parsed = JSON.parse(err.message);
                    message = Object.values(parsed).flat().join(' ');
                } catch {}
                notification.error({
                    message: 'Registration failed',
                    description: message,
                });
            } finally {
                setLoading(false);
            }
        }
    };

    if (loading) {
        return <Spin size='large' className='cvat-spinner' />;
    }

    if (error) {
        return (
            <div style={{ textAlign: 'center', padding: '20px' }}>
                <Text type='danger' style={{ fontSize: '16px' }}>{error}</Text>
            </div>
        );
    }

    return (
        <div className='cvat-invitation-confirm-page' style={{ padding: '20px' }}>
            <Row justify='center' align='middle'>
                <Col md={8} lg={6} xl={4}>
                    <h2>Create your account</h2>
                    <Form
                        form={form}
                        name='invitation_confirm'
                        onFinish={onFinish}
                        layout='vertical'
                    >
                        <Form.Item label='E-mail'>
                            <Input value={email || ''} disabled />
                        </Form.Item>

                        <Form.Item
                            name='username'
                            label='Username'
                            rules={[{ required: true, message: 'Please input your Username!' }]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            name='password'
                            label='Password'
                            rules={[{ required: true, message: 'Please input your password!' }]}
                            hasFeedback
                        >
                            <Input.Password />
                        </Form.Item>

                        <Form.Item
                            name='confirm'
                            label='Confirm Password'
                            dependencies={['password']}
                            hasFeedback
                            rules={[
                                { required: true, message: 'Please confirm your password!' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('password') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('The two passwords that you entered do not match!'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password />
                        </Form.Item>

                        <Form.Item>
                            <Button type='primary' htmlType='submit' loading={loading} block>
                                Create Account
                            </Button>
                        </Form.Item>
                    </Form>
                </Col>
            </Row>
        </div>
    );
}
