import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import SwipeableViews from 'react-swipeable-views';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Grid from '@material-ui/core/Grid';
import GithubRepo from "../GithubRepo"
import { Paper } from '@material-ui/core';

const styles = theme => ({
  root: {
    flexGrow: 1,
    marginTop: 30
  },
  paper: {
    padding: theme.spacing.unit * 2,
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
});

class Home extends React.Component {
  state = {
    value: 0,
  };

  handleChange = (event, value) => {
    this.setState({ value });
  };

  handleChangeIndex = index => {
    this.setState({ value: index });
  };

  render() {
    return (
      <div className={styles.root}>
         <Tabs
          value={this.state.value}
          onChange={this.handleChange}
          indicatorColor="primary"
          textColor="primary"
          fullWidth
        >
          <Tab label="Kudos" />
          <Tab label="Search" />
        </Tabs>
        <SwipeableViews
          axis={'x-reverse'}
          index={this.state.value}
          onChangeIndex={this.handleChangeIndex}
        >
          <Grid container spacing={16} style={{padding: '20px 0'}}>
            <Grid item xs={12} md={3}>
              <GithubRepo />
            </Grid>
            <Grid item xs={12} md={3}>
              <GithubRepo />
            </Grid>
            <Grid item xs={12} md={3}>
              <GithubRepo />
            </Grid>
          </Grid>
          <Grid container spacing={16} style={{padding: '20px 0'}}>
            <Grid item xs={12} md={3}>
              <GithubRepo />
            </Grid>
          </Grid>
        </SwipeableViews>
      </div>
    );
  }
}

export default withStyles(styles)(Home);