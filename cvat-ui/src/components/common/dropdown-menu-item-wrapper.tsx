import React, { forwardRef } from 'react';

interface Props {
    children: React.ReactElement;
}

const DropdownMenuItemWrapper = forwardRef((props: Props, ref: React.Ref<HTMLDivElement>): JSX.Element => {
    const { children } = props;
    return (
        <div ref={ref} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            {children}
        </div>
    );
});

export default DropdownMenuItemWrapper;
