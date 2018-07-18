// for cocos-redux

import { Store } from 'redux'

type connectFunc = (name?: string) => Function
type connectFunc = (_class?: Function) => void

type connect = (mapStateToProps: any, mapDispatchToProps?: any, mergeProps?: any) => connectFunc

export function createConnect(store: Store<any>): connect