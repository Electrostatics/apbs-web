import React, { Component } from 'react';
import ReactGA from 'react-ga';
import 'antd/dist/antd.css';
import { Layout, Col, Row } from 'antd';
import { Typography } from 'antd';
import { Divider } from 'antd';
// import { ExportOutlined } from '@ant-design/icons'
import { hasAnalyticsId, hasMeasurementId, sendPageView, sendRegisterClickEvent } from './utils/ga-utils'

const { Content } = Layout;
const { Title, Text, Link } = Typography;

class DocumentationPage extends Component{
    constructor(props){
        super(props)
        if( hasAnalyticsId() )
            ReactGA.pageview(window.location.pathname + window.location.search)
    }
    
    render(){
        let apbs_block = '$ apbs [options] input-file'
        let pdb2pqr_block = '$ pdb2pqr [options] --ff={forcefield} {pdb-path} {output-path}'
        return(
            <Layout id="download" style={{ padding: '16px 0', marginBottom: 5, background: '#fff', boxShadow: "2px 4px 3px #00000033" }}>
                <Content style={{ background: '#fff', padding: 16, margin: 0, minHeight: 280 }}>
                    <Col offset={2} span={20}>
                        <Title>
                            Documentation
                        </Title>
                        <Title level={4}>
                            Project homepage:
                            <Link href={window._env_.PROJECT_HOME_URL} target="_blank" rel="noopener noreferrer"> PoissonBoltzmann.org </Link>
                            {/* <Link href={window._env_.PROJECT_HOME_URL} target="_blank" rel="noopener noreferrer"> 
                                Project Homepage <ExportOutlined />
                             </Link> */}
                        </Title>
                        <Divider/>

                        {/* Display links to documentation page */}
                        <Title level={3}>
                            Full Documention
                        </Title>
                        <Text>
                            Learn more about APBS and PDB2PQR at their respective documentation sites:
                        </Text>
                        <ul>
                            <li><a target="_blank" rel="noopener noreferrer" href={window._env_.DOC_URL_APBS}> APBS </a></li>
                            <li><a target="_blank" rel="noopener noreferrer" href={window._env_.DOC_URL_PDB2PQR}> PDB2PQR </a></li>
                        </ul>
                        <br/>

                        {/* Display basic software usage */}
                        <Title level={3}>
                            Basic Usage:
                        </Title>
                        <Title level={4}> APBS </Title>
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
                        
                        {/* <h3>PDB2PQR</h3> */}
                        <Title level={4}> PDB2PQR </Title>
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
                        <br/>
                        
                        {/* Display links to documentation page */}
                        <Title level={3} >
                            Examples
                        </Title>
                        <Text>
                            In-depth examples for using either software can be found at the following:
                        </Text>
                        <ul>
                            <li><a target="_blank" rel="noopener noreferrer" href={window._env_.DOC_EXAMPLES_APBS}> APBS </a></li>
                            <li><a target="_blank" rel="noopener noreferrer" href={window._env_.DOC_EXAMPLES_PDB2PQR}> PDB2PQR </a></li>
                        </ul>
                        <br/>

                    </Col>
                </Content>
            </Layout>
        )
    }
}

export default DocumentationPage