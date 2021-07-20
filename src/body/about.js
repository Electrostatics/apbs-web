import React, { Component } from 'react';
import ReactGA from 'react-ga';
import 'antd/dist/antd.css';

import { Layout, Typography, Col, Row, Spin, Alert } from 'antd';
const { Content } = Layout;
const { Title, Paragraph, Text, Link } = Typography

class AboutPage extends Component {
  constructor(props) {
    super(props)
    if (window._env_.GA_TRACKING_ID !== "")
      ReactGA.pageview(window.location.pathname + window.location.search)

    const spin_placeholder = <Spin/>
    this.state = {
      show_download_error: false,
      apbs_version: spin_placeholder,
      pdb2pqr_version: spin_placeholder,
      website_version: spin_placeholder,
      backend_version: spin_placeholder,
    }
  }

  componentDidMount() {
    this.loadVersionInfo()
  }

  loadVersionInfo() {
    // Download version information from cloud
    fetch(window._env_.VERSIONS_URL)
    .then( response => response.json() )
    .then( version_data => {
      this.setState({
        apbs_version: version_data.apbs,
        pdb2pqr_version: version_data.pdb2pqr,
        website_version: window._env_.CODEBUILD_RESOLVED_SOURCE_VERSION,
        backend_version: version_data.aws,
        show_download_error: false,
      })
    })
    .catch( err => {
      console.error(err)
      this.setState({
        apbs_version: null,
        pdb2pqr_version: null,
        website_version: window._env_.CODEBUILD_RESOLVED_SOURCE_VERSION,
        backend_version: null,

        show_download_error: true,
      })
      
    })
  }

  retryDownload(){
    // Reset spinners
    const spin_placeholder = <Spin/>
    this.setState({
      apbs_version: spin_placeholder,
      pdb2pqr_version: spin_placeholder,
      website_version: spin_placeholder,
      backend_version: spin_placeholder,
      show_download_error: false
    })

    // Attempt download again
    this.loadVersionInfo()
  }

  render() {
    const title_level = 1
    const subtitle_level = 3
    const version_title_level = 5
    const APBS_VERSION = this.state.apbs_version
    const PDB2PQR_VERSION = this.state.pdb2pqr_version
    const WEBSITE_VERSION = typeof this.state.website_version === 'string' ? this.state.website_version.slice(0, 7) : this.state.website_version
    const BACKEND_VERSION = typeof this.state.backend_version === 'string' ? this.state.backend_version.slice(0, 7) : this.state.backend_version
    const website_build_url = `${window._env_.REPO_URL_WEB}/tree/${this.state.website_version}`
    const backend_build_url = `${window._env_.REPO_URL_AWS}/tree/${this.state.backend_version}`

    const refresh_block = <div>
        <Text type="danger">Version information not found.</Text>
    </div>


    let apbs_version_block
    let pdb2pqr_version_block
    let backend_version_block
    let website_version_block

    // APBS version text building
    if(this.state.apbs_version){
      apbs_version_block =
        <div>{APBS_VERSION} (<Link href={window._env_.RELEASE_HISTORY_APBS} target="_blank">see Changelog</Link>)</div>
    }else{        
      apbs_version_block =
        <div>{refresh_block} (<Link href={window._env_.RELEASE_HISTORY_APBS} target="_blank">see Changelog</Link>)</div>
    }

    // PDB2PQR version text building
    if(this.state.pdb2pqr_version){
      pdb2pqr_version_block =
        <div>{PDB2PQR_VERSION} (<Link href={window._env_.RELEASE_HISTORY_PDB2PQR} target="_blank">see Changelog</Link>)</div>
    }else{
      pdb2pqr_version_block =
        <div>{refresh_block} (<Link href={window._env_.RELEASE_HISTORY_PDB2PQR} target="_blank">see Changelog</Link>)</div>
    }

    // Backend version text
    if(this.state.backend_version){
      backend_version_block = <div>
        Build commit hash: <Link href={backend_build_url} target="_blank">{BACKEND_VERSION}</Link>
      </div>

    }else{
      backend_version_block = refresh_block
    }

    // Website version text
    if(this.state.website_version){
      website_version_block = <div>
        Build commit hash: <Link href={website_build_url} target="_blank">{WEBSITE_VERSION}</Link>
      </div>

    }else{
      website_version_block = refresh_block
    }


    // Build error alert row if download failed
    let error_alert = null
    if(this.state.show_download_error){
      error_alert =
        <Row><Col xs={24} md={20} lg={18} xl={14}>
          <Alert
            showIcon
            type="error"
            message="Could not retrieve version information. Please try again later."
            closeText="Reload"
            afterClose={() => this.retryDownload()}
          />
        </Col></Row>
    }

    return (
      <Layout id="about" style={{ padding: '16px 0', marginBottom: 5, background: '#fff', boxShadow: "2px 4px 3px #00000033" }}>
        <Content style={{ background: '#fff', padding: 16, margin: 0, minHeight: 280 }}>
          <Col offset={2} span={20}>

            <Typography>
              <Title level={title_level}>
                About
              </Title>

              {/* Display error alert if version file couldn't be found */}
              {error_alert}

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
                        {/* {APBS_VERSION} (<Link href={window._env_.RELEASE_HISTORY_APBS} target="_blank">see Changelog</Link>) */}
                        {apbs_version_block}
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
                        {/* {PDB2PQR_VERSION} (<Link href={window._env_.RELEASE_HISTORY_PDB2PQR} target="_blank">see Changelog</Link>) */}
                        {pdb2pqr_version_block}
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
                        {/* Build commit hash: <Link href={backend_build_url} target="_blank">{BACKEND_VERSION}</Link> */}
                        {backend_version_block}
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
                        {/* Build commit hash: <Link href={website_build_url} target="_blank">{WEBSITE_VERSION}</Link> */}
                        {website_version_block}
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
            </Typography>
          </Col>
        </Content>
      </Layout>
    )
  }
}

export default AboutPage