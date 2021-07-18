import React, { Component } from 'react';
import ReactGA from 'react-ga';
import 'antd/dist/antd.css';
// import './home.css';

import { Layout, Typography, Col, Row } from 'antd';
import { GithubOutlined } from '@ant-design/icons'
const { Content } = Layout;
const { Title, Paragraph, Text, Link } = Typography

class AboutPage extends Component{
    constructor(props){
        super(props)
        if( window._env_.GA_TRACKING_ID !== "" ) 
            ReactGA.pageview(window.location.pathname + window.location.search)

        this.state = {
            apbs_version: null,
            pdb2pqr_version: null,
            website_version: null,
            backend_version: null,
        }
    }

    componentDidMount(){
        this.loadVersionInfo()
    }    

    loadVersionInfo(){
        // TODO: Elvis, 2021/07/18 - Download necessary version information from elsewhere
        this.setState({
            apbs_version: window._env_.APBS_VERSION,
            pdb2pqr_version: window._env_.PDB2PQR_VERSION,
            website_version: window._env_.CODEBUILD_RESOLVED_SOURCE_VERSION,
            backend_version: null,
        })
    }

    render(){
        const title_level = 1
        const subtitle_level = 3
        const version_title_level = 5
        const APBS_VERSION = this.state.apbs_version
        const PDB2PQR_VERSION = this.state.pdb2pqr_version
        const WEBSITE_VERSION = typeof this.state.website_version === 'string' ? this.state.website_version.slice(0,7) : this.state.website_version
        const BACKEND_VERSION = typeof this.state.backend_version === 'string' ? this.state.backend_version.slice(0,7) : this.state.backend_version
        const website_build_url = `${window._env_.REPO_URL_WEB}/tree/${this.state.website_version}`
        const backend_build_url = `${window._env_.REPO_URL_WEB}/tree/${this.state.backend_version}`
        return(
            <Layout id="about" style={{ padding: '16px 0', marginBottom: 5, background: '#fff', boxShadow: "2px 4px 3px #00000033" }}>
                <Content style={{ background: '#fff', padding: 16, margin: 0, minHeight: 280 }}>
                    <Col offset={2} span={20}>

                        <Typography>
                            <Title level={title_level}>
                                About
                            </Title>

                            {/* Description */}
                            {/* <Title level={subtitle_level}>
                                What does this service do?
                            </Title>
                            <Paragraph>
                                This server enables a user to convert PDB files into PQR files. PQR files are PDB files where the occupancy and B-factor columns have been replaced by per-atom charge and radius.
                                pKa calculations are performed by PROPKA.
                            </Paragraph> */}


                            {/* Version info */}
                            {/* <Link href={} target="_blank"></Link> */}
                            <Title level={subtitle_level}>
                                Build Information
                            </Title>

                            <Row>
                                <Paragraph>
                                    This version of the APBS web service currently uses the following versions of each respective software:
                                </Paragraph>
                            </Row>
                            <Row>
                                <Col span={12}>
                                    <Title level={version_title_level}>APBS</Title>
                                    <Paragraph>
                                        <ul>
                                            <li>
                                                {APBS_VERSION} (<Link href={window._env_.RELEASE_HISTORY_APBS} target="_blank">see Changelog</Link>)
                                            </li>
                                            <li>
                                                <Link href={window._env_.REPO_URL_APBS} target="_blank">GitHub</Link>
                                            </li>
                                        </ul>
                                    </Paragraph>
                                    <Title level={version_title_level}>PDB2PQR</Title>
                                    <Paragraph>
                                        <ul>
                                            <li>
                                                {PDB2PQR_VERSION} (<Link href={window._env_.RELEASE_HISTORY_PDB2PQR} target="_blank">see Changelog</Link>)
                                            </li>
                                            <li>
                                                <Link href={window._env_.REPO_URL_PDB2PQR} target="_blank">GitHub</Link>
                                            </li>
                                        </ul>
                                    </Paragraph>

                                </Col>
                                <Col span={12}>
                                    <Title level={version_title_level}>Backend Services</Title>
                                    <Paragraph>
                                        <ul>
                                            <li>
                                                {/* (backend services build version goes here) */}
                                                {/* Build commit hash: <Link href={website_build_url} target="_blank">{WEBSITE_VERSION.slice(0, 7)}</Link> */}
                                                Build commit hash: <Link href={website_build_url} target="_blank">{WEBSITE_VERSION}</Link>
                                            </li>
                                            <li>
                                                <Link href={window._env_.REPO_URL_AWS} target="_blank">GitHub</Link>
                                            </li>
                                        </ul>
                                    </Paragraph>

                                    <Title level={version_title_level}>Website</Title>
                                    <Paragraph>
                                        <ul>
                                            <li>
                                                {/* (site build version goes here) */}
                                                Build commit hash: <Link href={backend_build_url} target="_blank">{BACKEND_VERSION}</Link>
                                            </li>
                                            <li>
                                                <Link href={window._env_.REPO_URL_WEB} target="_blank">GitHub</Link>
                                            </li>
                                        </ul>
                                    </Paragraph>

                                </Col>

                            </Row>

                            {/* Grant and Citation info */}
                            <Title level={subtitle_level}>
                                Citation(s)
                            </Title>
                            <Paragraph>
                                <Text strong>
                                Please cite the following when using this software in a publication:
                                </Text>
                                <ul>
                                    <li>
                                        <Link italic href={"https://pubmed.ncbi.nlm.nih.gov/28836357/"} target="_blank">
                                            Improvements to the APBS biomolecular solvation software suite
                                        </Link>
                                        <ul>
                                            <li>
                                                <Text copyable>
                                                    Jurrus E, Engel D, Star K, Monson K, Brandi J, Felberg LE, Brookes DH, Wilson L, Chen J,
                                                    Liles K, Chun M, Li P, Gohara DW, Dolinsky T, Konecny R, Koes DR, Nielsen JE, Head-Gordon T,
                                                    Geng W, Krasny R, Wei GW, Holst MJ, McCammon JA, Baker NA. Improvements to the APBS biomolecular
                                                    solvation software suite. Protein Sci. 2018 Jan;27(1):112-128. doi: 10.1002/pro.3280. Epub 2017
                                                    Oct 24. PMID: 28836357; PMCID: PMC5734301.
                                                </Text>
                                            </li>
                                        </ul>
                                    </li>
                                </ul>
                            </Paragraph>

                            {/* Old site info */}
                            {/* <Title level={subtitle_level}>
                                The original PDB2PQR application and web server was written by:
                            </Title>
                            <Paragraph>
                                <ul>
                                    <li>Jens Erik Nielsen</li>
                                    <li>Todd Dolinsky</li>
                                    <li>Nathan Baker</li>
                                    <li>Kyle Monson</li>
                                </ul>
                            </Paragraph>

                            <Title level={subtitle_level}>
                                3dMol visualization provided by:
                            </Title>
                            <Paragraph>
                                <ul>
                                    <li>Wes Goodman</li>
                                    <li>Samir Unni</li>
                                    <li>Yong Huang</li>
                                </ul>
                            </Paragraph>
                            
                            <Title level={subtitle_level}>
                                JMol visualization scripts and applets provided by:
                            </Title>
                            <Paragraph>
                                <ul>
                                    <li>Robert Hanson</li>
                                </ul>
                            </Paragraph> */}
                            
                        </Typography>
                    </Col>


                    {/* <h3>The original PDB2PQR application and web server was written by:</h3>
                    <ul>
                        <li>Jens Erik Nielsen</li>
                        <li>Todd Dolinsky</li>
                        <li>Nathan Baker</li>
                        <li>Kyle Monson</li>
                    </ul> */}

                    
                    {/* <h3>PDB2PQR Opal integration by:</h3>
                    <ul>
                        <li>Wes Goodman</li>
                        <li>Samir Unni</li>
                        <li>Yong Huang</li>
                    </ul> */}


                    {/* <h3>3dMol visualization provided by:</h3>
                    <ul>
                        <li>David Koes</li>
                    </ul> */}


                    {/* <h3>JMol visualization scripts and applets provided by:</h3>
                    <ul>
                        <li>Robert Hanson</li>
                    </ul> */}
                </Content>
            </Layout>
        )
    }
}

export default AboutPage