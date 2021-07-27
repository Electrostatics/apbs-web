import React, { Component } from 'react';
import ReactGA from 'react-ga';
import 'antd/dist/antd.css';
import { Link as ReactRouterLink } from 'react-router-dom';
import { Layout, Col, Row } from 'antd';
import { Typography } from 'antd';
import { Divider } from 'antd';
// import { ExportOutlined } from '@ant-design/icons'
import { hasAnalyticsId, hasMeasurementId, sendPageView, sendRegisterClickEvent } from './utils/ga-utils'

const { Content } = Layout;
const { Title, Paragraph, Text, Link } = Typography;

class DocumentationPage extends Component{
    constructor(props){
        super(props)
        if( hasAnalyticsId() )
            ReactGA.pageview(window.location.pathname + window.location.search)
    }
    
    render(){
        return(
            <Layout id="download" style={{ padding: '16px 0', marginBottom: 5, background: '#fff', boxShadow: "2px 4px 3px #00000033" }}>
                <Content style={{ background: '#fff', padding: 16, margin: 0, minHeight: 280 }}>
                    <Col offset={2} span={20}>
                        <Typography>
                            <Title>Documentation</Title>

                            <Title level={5}>
                                {/* Project Homepage */}
                                {/* Project homepage:
                                <Link href={window._env_.PROJECT_HOME_URL} target="_blank" rel="noopener noreferrer"> PoissonBoltzmann.org </Link> */}
                                Visit our project home page:
                                <Link strong href={window._env_.PROJECT_HOME_URL} target="_blank" rel="noopener noreferrer"> PoissonBoltzmann.org </Link>
                            </Title>
                            
                            {/* <Paragraph>
                                Come visit our project page at
                                <Link strong href={window._env_.PROJECT_HOME_URL} target="_blank" rel="noopener noreferrer"> PoissonBoltzmann.org </Link>
                            </Paragraph> */}
                            
                            <Divider/>

                            {/* Display links to documentation page */}
                            <Title level={3}>Full Documention</Title>
                            <Paragraph>
                                Learn more about APBS and PDB2PQR at their respective documentation sites:
                            </Paragraph>
                            <Paragraph>
                                <ul>
                                    <li><Link target="_blank" rel="noopener noreferrer" href={window._env_.DOC_URL_APBS}> APBS </Link></li>
                                    <li><Link target="_blank" rel="noopener noreferrer" href={window._env_.DOC_URL_PDB2PQR}> PDB2PQR </Link></li>
                                </ul>
                            </Paragraph>

                            
                            {/* Display links to documentation page */}
                            <Title level={3}>Examples</Title>
                            <Paragraph>
                                <Text>
                                    In-depth examples for using either software can be found at the following:
                                </Text>
                            </Paragraph>
                            <Paragraph>
                                <ul>
                                    <li><Link target="_blank" rel="noopener noreferrer" href={window._env_.DOC_EXAMPLES_APBS}> APBS </Link></li>
                                    <li><Link target="_blank" rel="noopener noreferrer" href={window._env_.DOC_EXAMPLES_PDB2PQR}> PDB2PQR </Link></li>
                                </ul>
                            </Paragraph>

                            <Title level={3}>Who paid for this?</Title>
                            <Paragraph>
                                This software is made possible by generous support from the US National Institutes of Health through grant <Link target="_blank" rel="noopener noreferrer" href="https://pubmed.ncbi.nlm.nih.gov/?term=R01+GM069702%2FGM%2FNIGMS+NIH+HHS%2FUnited+States%5BGrant+Number%5D">GM69702</Link>.
                            </Paragraph>
                            <Paragraph>
                                Please support the continued development of APBS by <Link target="_blank" rel="noopener" onClick={() => sendRegisterClickEvent('documentation')} href={window._env_.REGISTRATION_URL}> registering your use </Link> and using the proper <ReactRouterLink to="/about#citations">citation</ReactRouterLink> in your publication.
                            </Paragraph>

                        </Typography>
                    </Col>
                </Content>
            </Layout>
        )
    }
}

export default DocumentationPage