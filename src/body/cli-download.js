import React, { Component } from 'react';
import ReactGA from 'react-ga';

// import 'antd/dist/antd.css';


// import './home.css';

import { Layout, Col, Menu, Carousel, Row, Card, Button, Link } from 'antd';
const { Content } = Layout;

class DownloadPage extends Component{
    constructor(props){
        super(props)
        if( window._env_.GA_TRACKING_ID !== "" ) 
            ReactGA.pageview(window.location.pathname + window.location.search)
    }

    
    render(){
        let build_date = 'N/A'
        if (window._env_.BUILD_DATE !== undefined)
            build_date = window._env_.BUILD_DATE
        // let build_date = window._env_.BUILD_DATE ? window._env_.BUILD_DATE !== undefined : 'N/A'
        let apbs_block = '$ ./apbs [options] input-file'
        let pdb2pqr_block = '$ ./pdb2pqr [options] --ff={forcefield} {pdb-path} {output-path}'
        return(
            <Layout id="download" style={{ padding: '16px 0', marginBottom: 5, background: '#fff', boxShadow: "2px 4px 3px #00000033" }}>
                <Content style={{ background: '#fff', padding: 16, margin: 0, minHeight: 280 }}>
                    <Col offset={2} span={20}>
                        <h2>
                            Download the Command Line Binaries
                        </h2>
                        <hr/><br/>
                        <p>
                            To interact with APBS-REST from the command line, we have new tools to do so!
                            If you're already familiar with the command line tools for ABPS and PDB2PQR, then
                            the interface should remain largely unchanged
                        </p>
                        
                        <br/>
                        <h2>
                            Download Links 
                        </h2>
                            Binaries build date: <b>{build_date}</b>
                            <ul>
                                <li><a href="/cli/download/apbs-rest-cli_win.zip"> Windows (amd64) </a></li>
                                <li><a href="/cli/download/apbs-rest-cli_macOS.zip"> macOS (amd64) </a></li>
                                <li><a href="/cli/download/apbs-rest-cli_linux.tar"> Linux (amd64) </a></li>
                            </ul>
                            {/* <h3>
                                APBS
                            </h3>
                            <ul>
                                <li><a href="/cli/download/apbs_amd64-windows.exe"> Windows (amd64) </a></li>
                                <li><a href="/cli/download/apbs_amd64-macOS"> macOS (amd64) </a></li>
                                <li><a href="/cli/download/apbs_amd64-linux"> Linux (amd64) </a></li>
                            </ul>

                            <h3>
                                PDB2PQR
                            </h3>
                            <ul>
                                <li><a href="/cli/download/apbs_amd64-windows.exe"> Windows (amd64) </a></li>
                                <li><a href="/cli/download/apbs_amd64-macOS"> macOS (amd64) </a></li>
                                <li><a href="/cli/download/apbs_amd64-linux"> Linux (amd64) </a></li>
                            </ul> */}
                        {/* <br/> */}
                        {/* <hr/> */}
                        <br/>

                        <h2>
                            How to Use
                        </h2>
                        <p>
                            Using the command line tools should mirror the same interface as the current tools 
                            for APBS and PDB2PQR. The one exception is that an <code><b>APBS_HOST</b></code> must be defined in environment. 
                            This can be your local installation or an online-hosted version of the software.
                        </p>
                        <h3>APBS</h3>
                        <Row>
                            <Col offset={1} span={10}>
                                {/* <pre style={{backgroundColor: '#eee'}}><code> */}
                                <pre ><code>
                                    <b>
                                        {apbs_block}
                                    </b>
                                </code></pre>
                            </Col>
                        </Row>
                        <h3>PDB2PQR</h3>
                        <Row>
                            <Col offset={1} span={13}>
                                {/* <pre style={{backgroundColor: '#eee'}}><code> */}
                                <pre ><code>
                                    <b>
                                        {pdb2pqr_block}
                                    </b>
                                </code></pre>
                            </Col>
                        </Row>
                        Further usage information for the CLI can be found on the
                        <a href='https://github.com/Electrostatics/apbs-rest/tree/master/cli'> APBS-REST GitHub</a> and
                        <a href='https://apbs-pdb2pqr.readthedocs.io/en/latest/'> APBS-PDB2PQR</a> documentation
                    </Col>
                </Content>
            </Layout>
        )
    }
}

export default DownloadPage