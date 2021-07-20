import React, { Component } from 'react';
import { Link as ReactRouterLink } from 'react-router-dom';
import 'antd/dist/antd.css';
import '../styles/myfooter.css';

import { CopyToClipboard } from 'react-copy-to-clipboard';
import { CopyOutlined, GithubOutlined, LinkOutlined } from '@ant-design/icons';
import { Layout, Tooltip, Popover, Typography, Col, Row } from 'antd';

const { Link, Paragraph } = Typography;
const { Footer } = Layout;

/**
 * This is the footer component. Serves as footer for every page
 */
class MyFooter extends Component{
    state = {
        copied: false,
        copyTooltip: "Copy to clipboard"
    }

    /** Resets text within "Copy to clipboard" tooltip   */
    tooltipCopyTextChange(){
        this.setState({ copied: true, copyTooltip: "Copied" })
        setTimeout(() => {
            this.setState({ copied: false, copyTooltip: "Copy to clipboard" })
        }, 1500);
    }

    generateCopyTooltip(text, placement){
        return (
            <Tooltip title={this.state.copyTooltip} placement={placement} >
                <CopyToClipboard text={text.trim()} onCopy={() => this.tooltipCopyTextChange()}>
                    <CopyOutlined
                        id="copyCitation"
                        className="footer-icon"
                        value={text}
                        style={{ fontSize: 26, cursor: "pointer" }} />
                </CopyToClipboard>
            </Tooltip>
        );
    }
    generateLinkTooltip(url_text, placement){
        return (
            <Tooltip title="Go to publication" placement={placement}>
                <a href={url_text} target="BLANK">
                    <LinkOutlined
                        // style={{ fontSize: 26, color: "#545456" }}
                        className="footer-icon" />
                </a>
            </Tooltip>
        );
    }

    render(){
        // Popover text for GitHub icon in footer
        let github_popover_content =
            <div >
                <Link target="_blank" href={window._env_.REPO_URL_APBS}> APBS </Link>|
                <Link target="_blank" href={window._env_.REPO_URL_PDB2PQR}> PDB2PQR </Link>|
                <Link target="_blank" href={window._env_.REPO_URL_AWS}> AWS </Link>|
                <Link target="_blank" href={window._env_.REPO_URL_WEB}> Web </Link>
            </div>

        return (
            <Footer className="footer-block">
                <Row key='citation-prompt' justify="center">
                    <Paragraph>
                        Using this software for a publication? Find the proper citation <ReactRouterLink to="/about#citations">here</ReactRouterLink>.
                    </Paragraph>
                </Row>

                <Row key='bug-report-prompt' justify="center">
                    <Paragraph>
                        Found a bug? Report any issues to the respective project GitHub.
                    </Paragraph>
                </Row>

                {/* Links to APBS & PDB2PQR GitHub */}
                <Row key='github-links' align="middle" justify="center">
                    <Paragraph>
                        <Popover content={github_popover_content} title="GitHub Repositories" trigger="hover" placement="right">
                            <GithubOutlined className="footer-icon" />
                        </Popover>
                    </Paragraph>
                </Row>
            </Footer>
        );
    }
}

export default MyFooter;